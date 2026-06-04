// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title NhaTro - Hệ thống quản lý nhà trọ trên Blockchain
 * @author Senior Blockchain Developer
 * @notice Smart contract quản lý phòng trọ, thuê phòng và thanh toán ETH
 */
contract NhaTro {
    address public owner;

    enum RoomStatus { Available, Rented }

    struct Room {
        uint256 roomId;
        string name;
        uint256 pricePerMonth; // đơn vị: wei
        RoomStatus status;
        address tenant;
        uint256 rentedAt;
        uint256 totalPaid;
    }

    uint256 public roomCount;
    mapping(uint256 => Room) public rooms;

    // ===================== EVENTS =====================
    event RoomAdded(uint256 indexed roomId, string name, uint256 price);
    event RoomRented(uint256 indexed roomId, address indexed tenant, uint256 timestamp);
    event RentPaid(uint256 indexed roomId, address indexed tenant, uint256 amount, uint256 timestamp);
    event RoomVacated(uint256 indexed roomId, address indexed previousTenant);

    // ===================== MODIFIERS =====================
    modifier onlyOwner() {
        require(msg.sender == owner, "Chi chu hop dong moi duoc thuc hien");
        _;
    }

    modifier roomExists(uint256 _roomId) {
        require(_roomId > 0 && _roomId <= roomCount, "Phong khong ton tai");
        _;
    }

    modifier roomAvailable(uint256 _roomId) {
        require(rooms[_roomId].status == RoomStatus.Available, "Phong da duoc thue");
        _;
    }

    modifier roomRented(uint256 _roomId) {
        require(rooms[_roomId].status == RoomStatus.Rented, "Phong chua duoc thue");
        _;
    }

    modifier onlyTenant(uint256 _roomId) {
        require(rooms[_roomId].tenant == msg.sender, "Ban khong phai nguoi thue phong nay");
        _;
    }

    // ===================== CONSTRUCTOR =====================
    constructor() {
        owner = msg.sender;
    }

    // ===================== FUNCTIONS =====================

    /**
     * @notice Thêm phòng trọ mới (chỉ owner)
     * @param _name Tên phòng
     * @param _pricePerMonth Giá thuê mỗi tháng (wei)
     */
    function addRoom(string calldata _name, uint256 _pricePerMonth) external onlyOwner {
        require(bytes(_name).length > 0, "Ten phong khong duoc trong");
        require(_pricePerMonth > 0, "Gia thue phai lon hon 0");

        roomCount++;
        rooms[roomCount] = Room({
            roomId: roomCount,
            name: _name,
            pricePerMonth: _pricePerMonth,
            status: RoomStatus.Available,
            tenant: address(0),
            rentedAt: 0,
            totalPaid: 0
        });

        emit RoomAdded(roomCount, _name, _pricePerMonth);
    }

    /**
     * @notice Thuê phòng
     * @param _roomId ID phòng muốn thuê
     */
    function rentRoom(uint256 _roomId)
        external
        roomExists(_roomId)
        roomAvailable(_roomId)
    {
        require(msg.sender != owner, "Chu nha khong the tu thue phong");

        Room storage room = rooms[_roomId];
        room.status = RoomStatus.Rented;
        room.tenant = msg.sender;
        room.rentedAt = block.timestamp;

        emit RoomRented(_roomId, msg.sender, block.timestamp);
    }

    /**
     * @notice Thanh toán tiền thuê phòng bằng ETH
     * @param _roomId ID phòng cần thanh toán
     */
    function payRent(uint256 _roomId)
        external
        payable
        roomExists(_roomId)
        roomRented(_roomId)
        onlyTenant(_roomId)
    {
        require(msg.value > 0, "So tien thanh toan phai lon hon 0");
        require(msg.value >= rooms[_roomId].pricePerMonth, "So tien thanh toan chua du");

        rooms[_roomId].totalPaid += msg.value;

        // Chuyển tiền cho chủ nhà
        (bool success, ) = payable(owner).call{value: msg.value}("");
        require(success, "Thanh toan that bai");

        emit RentPaid(_roomId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Trả phòng (người thuê hoặc chủ nhà có thể gọi)
     * @param _roomId ID phòng cần trả
     */
    function vacateRoom(uint256 _roomId)
        external
        roomExists(_roomId)
        roomRented(_roomId)
    {
        Room storage room = rooms[_roomId];
        require(
            msg.sender == room.tenant || msg.sender == owner,
            "Chi nguoi thue hoac chu nha moi duoc tra phong"
        );

        address previousTenant = room.tenant;
        room.status = RoomStatus.Available;
        room.tenant = address(0);
        room.rentedAt = 0;

        emit RoomVacated(_roomId, previousTenant);
    }

    /**
     * @notice Lấy danh sách tất cả phòng
     * @return Mảng tất cả Room structs
     */
    function getRooms() external view returns (Room[] memory) {
        Room[] memory allRooms = new Room[](roomCount);
        for (uint256 i = 1; i <= roomCount; i++) {
            allRooms[i - 1] = rooms[i];
        }
        return allRooms;
    }

    /**
     * @notice Lấy thông tin một phòng cụ thể
     * @param _roomId ID phòng
     */
    function getRoom(uint256 _roomId)
        external
        view
        roomExists(_roomId)
        returns (Room memory)
    {
        return rooms[_roomId];
    }

    /**
     * @notice Kiểm tra phòng có trống không
     * @param _roomId ID phòng
     */
    function isAvailable(uint256 _roomId)
        external
        view
        roomExists(_roomId)
        returns (bool)
    {
        return rooms[_roomId].status == RoomStatus.Available;
    }

    /**
     * @notice Lấy số dư của contract
     */
    function getBalance() external view onlyOwner returns (uint256) {
        return address(this).balance;
    }
}
