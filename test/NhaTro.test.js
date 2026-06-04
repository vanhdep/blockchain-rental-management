const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NhaTro Smart Contract", function () {
  let nhaTro;
  let owner;
  let tenant1;
  let tenant2;
  let addrs;

  const ROOM_PRICE = ethers.parseEther("0.1"); // 0.1 ETH/tháng
  const ROOM_NAME = "Phòng 101";

  beforeEach(async function () {
    // Lấy các accounts
    [owner, tenant1, tenant2, ...addrs] = await ethers.getSigners();

    // Deploy contract mới trước mỗi test
    const NhaTro = await ethers.getContractFactory("NhaTro");
    nhaTro = await NhaTro.deploy();
    await nhaTro.waitForDeployment();
  });

  // ===================== DEPLOY =====================
  describe("Deployment", function () {
    it("Phải set owner chính xác", async function () {
      expect(await nhaTro.owner()).to.equal(owner.address);
    });

    it("roomCount ban đầu phải là 0", async function () {
      expect(await nhaTro.roomCount()).to.equal(0);
    });
  });

  // ===================== ADD ROOM =====================
  describe("addRoom", function () {
    it("Owner có thể thêm phòng", async function () {
      await expect(nhaTro.addRoom(ROOM_NAME, ROOM_PRICE))
        .to.emit(nhaTro, "RoomAdded")
        .withArgs(1, ROOM_NAME, ROOM_PRICE);

      expect(await nhaTro.roomCount()).to.equal(1);
    });

    it("Phòng sau khi thêm phải ở trạng thái Available", async function () {
      await nhaTro.addRoom(ROOM_NAME, ROOM_PRICE);
      const room = await nhaTro.getRoom(1);
      expect(room.status).to.equal(0); // 0 = Available
    });

    it("Lưu đúng thông tin phòng", async function () {
      await nhaTro.addRoom(ROOM_NAME, ROOM_PRICE);
      const room = await nhaTro.getRoom(1);

      expect(room.roomId).to.equal(1);
      expect(room.name).to.equal(ROOM_NAME);
      expect(room.pricePerMonth).to.equal(ROOM_PRICE);
      expect(room.tenant).to.equal(ethers.ZeroAddress);
    });

    it("Non-owner KHÔNG được thêm phòng", async function () {
      await expect(
        nhaTro.connect(tenant1).addRoom(ROOM_NAME, ROOM_PRICE)
      ).to.be.revertedWith("Chi chu hop dong moi duoc thuc hien");
    });

    it("Không thể thêm phòng với tên rỗng", async function () {
      await expect(
        nhaTro.addRoom("", ROOM_PRICE)
      ).to.be.revertedWith("Ten phong khong duoc trong");
    });

    it("Không thể thêm phòng với giá = 0", async function () {
      await expect(
        nhaTro.addRoom(ROOM_NAME, 0)
      ).to.be.revertedWith("Gia thue phai lon hon 0");
    });

    it("Thêm nhiều phòng và roomCount tăng đúng", async function () {
      await nhaTro.addRoom("Phòng 101", ROOM_PRICE);
      await nhaTro.addRoom("Phòng 102", ROOM_PRICE);
      await nhaTro.addRoom("Phòng 103", ROOM_PRICE);
      expect(await nhaTro.roomCount()).to.equal(3);
    });
  });

  // ===================== RENT ROOM =====================
  describe("rentRoom", function () {
    beforeEach(async function () {
      await nhaTro.addRoom(ROOM_NAME, ROOM_PRICE);
    });

    it("Tenant có thể thuê phòng trống", async function () {
      await expect(nhaTro.connect(tenant1).rentRoom(1))
        .to.emit(nhaTro, "RoomRented")
        .withArgs(1, tenant1.address, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));

      const room = await nhaTro.getRoom(1);
      expect(room.status).to.equal(1); // 1 = Rented
      expect(room.tenant).to.equal(tenant1.address);
    });

    it("Không thể thuê phòng đã được thuê", async function () {
      await nhaTro.connect(tenant1).rentRoom(1);
      await expect(
        nhaTro.connect(tenant2).rentRoom(1)
      ).to.be.revertedWith("Phong da duoc thue");
    });

    it("Owner không thể tự thuê phòng của mình", async function () {
      await expect(
        nhaTro.rentRoom(1)
      ).to.be.revertedWith("Chu nha khong the tu thue phong");
    });

    it("Không thể thuê phòng không tồn tại", async function () {
      await expect(
        nhaTro.connect(tenant1).rentRoom(999)
      ).to.be.revertedWith("Phong khong ton tai");
    });

    it("isAvailable trả về false sau khi thuê", async function () {
      expect(await nhaTro.isAvailable(1)).to.equal(true);
      await nhaTro.connect(tenant1).rentRoom(1);
      expect(await nhaTro.isAvailable(1)).to.equal(false);
    });
  });

  // ===================== PAY RENT =====================
  describe("payRent", function () {
    beforeEach(async function () {
      await nhaTro.addRoom(ROOM_NAME, ROOM_PRICE);
      await nhaTro.connect(tenant1).rentRoom(1);
    });

    it("Tenant có thể thanh toán tiền thuê đúng giá", async function () {
      await expect(
        nhaTro.connect(tenant1).payRent(1, { value: ROOM_PRICE })
      ).to.emit(nhaTro, "RentPaid").withArgs(
        1, tenant1.address, ROOM_PRICE,
        await ethers.provider.getBlock("latest").then(b => b.timestamp + 1)
      );
    });

    it("Tiền được chuyển cho owner", async function () {
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await nhaTro.connect(tenant1).payRent(1, { value: ROOM_PRICE });
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });

    it("totalPaid tăng sau thanh toán", async function () {
      await nhaTro.connect(tenant1).payRent(1, { value: ROOM_PRICE });
      const room = await nhaTro.getRoom(1);
      expect(room.totalPaid).to.equal(ROOM_PRICE);
    });

    it("Không thể thanh toán với số tiền ít hơn giá phòng", async function () {
      const lessThanPrice = ethers.parseEther("0.01");
      await expect(
        nhaTro.connect(tenant1).payRent(1, { value: lessThanPrice })
      ).to.be.revertedWith("So tien thanh toan chua du");
    });

    it("Không thể thanh toán với value = 0", async function () {
      await expect(
        nhaTro.connect(tenant1).payRent(1, { value: 0 })
      ).to.be.revertedWith("So tien thanh toan phai lon hon 0");
    });

    it("Người không phải tenant KHÔNG thể thanh toán", async function () {
      await expect(
        nhaTro.connect(tenant2).payRent(1, { value: ROOM_PRICE })
      ).to.be.revertedWith("Ban khong phai nguoi thue phong nay");
    });

    it("Không thể thanh toán phòng chưa được thuê", async function () {
      await nhaTro.addRoom("Phòng 102", ROOM_PRICE);
      await expect(
        nhaTro.connect(tenant1).payRent(2, { value: ROOM_PRICE })
      ).to.be.revertedWith("Phong chua duoc thue");
    });
  });

  // ===================== VACATE ROOM =====================
  describe("vacateRoom", function () {
    beforeEach(async function () {
      await nhaTro.addRoom(ROOM_NAME, ROOM_PRICE);
      await nhaTro.connect(tenant1).rentRoom(1);
    });

    it("Tenant có thể trả phòng", async function () {
      await expect(nhaTro.connect(tenant1).vacateRoom(1))
        .to.emit(nhaTro, "RoomVacated")
        .withArgs(1, tenant1.address);

      const room = await nhaTro.getRoom(1);
      expect(room.status).to.equal(0); // Available
      expect(room.tenant).to.equal(ethers.ZeroAddress);
    });

    it("Owner có thể trục xuất tenant", async function () {
      await nhaTro.vacateRoom(1);
      const room = await nhaTro.getRoom(1);
      expect(room.status).to.equal(0);
    });

    it("Sau khi trả phòng có thể thuê lại", async function () {
      await nhaTro.connect(tenant1).vacateRoom(1);
      await expect(nhaTro.connect(tenant2).rentRoom(1)).to.not.be.reverted;
    });
  });

  // ===================== GET ROOMS =====================
  describe("getRooms", function () {
    it("Trả về mảng rỗng khi chưa có phòng", async function () {
      const rooms = await nhaTro.getRooms();
      expect(rooms.length).to.equal(0);
    });

    it("Trả về đúng số lượng phòng", async function () {
      await nhaTro.addRoom("Phòng 101", ROOM_PRICE);
      await nhaTro.addRoom("Phòng 102", ROOM_PRICE);
      await nhaTro.addRoom("Phòng 103", ROOM_PRICE);

      const rooms = await nhaTro.getRooms();
      expect(rooms.length).to.equal(3);
    });

    it("Phản ánh đúng trạng thái sau khi thuê", async function () {
      await nhaTro.addRoom("Phòng 101", ROOM_PRICE);
      await nhaTro.connect(tenant1).rentRoom(1);

      const rooms = await nhaTro.getRooms();
      expect(rooms[0].status).to.equal(1); // Rented
      expect(rooms[0].tenant).to.equal(tenant1.address);
    });
  });
});
