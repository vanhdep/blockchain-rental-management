# 🏠 NhaTro Chain - DApp Quản lý Nhà Trọ Blockchain

> Hệ thống quản lý nhà trọ phi tập trung trên Ethereum — thuê phòng & thanh toán ETH trực tiếp qua Smart Contract.

---

## 📦 Cấu trúc dự án

```
nha-tro-dapp/
├── contracts/
│   └── NhaTro.sol              ← Smart Contract chính
├── scripts/
│   └── deploy.js               ← Script deploy
├── test/
│   └── NhaTro.test.js          ← Unit tests (Mocha/Chai)
├── hardhat.config.js           ← Cấu hình Hardhat
├── package.json
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx             ← Component gốc
        ├── App.css             ← Styles
        ├── main.jsx            ← Entry point
        ├── components/
        │   ├── Header.jsx      ← Header + kết nối ví
        │   ├── RoomCard.jsx    ← Card hiển thị phòng
        │   ├── AddRoomModal.jsx← Modal thêm phòng
        │   └── Toast.jsx       ← Thông báo
        └── utils/
            ├── constants.js    ← Địa chỉ contract
            ├── useContract.js  ← Hook kết nối blockchain
            └── NhaTro.json     ← ABI contract
```

---

## ⚡ Cài đặt & Chạy — Từng bước

### Bước 1: Cài đặt Node.js & MetaMask

```bash
# Kiểm tra Node.js (cần >= 18)
node --version

# Cài MetaMask extension trên Chrome/Firefox
# https://metamask.io/download/
```

### Bước 2: Cài dependencies cho Smart Contract

```bash
cd nha-tro-dapp
npm install
```

### Bước 3: Compile Smart Contract

```bash
npx hardhat compile
```

Kết quả mong đợi:
```
Compiled 1 Solidity file successfully
```

### Bước 4: Chạy Tests

```bash
npx hardhat test
```

Kết quả mong đợi: tất cả tests PASS ✅

### Bước 5: Khởi động Local Blockchain

**Cách A — Hardhat Node (khuyên dùng):**
```bash
# Mở terminal mới
npx hardhat node
```

Terminal sẽ hiển thị 20 accounts với private key và 10000 ETH mỗi account.

**Cách B — Ganache GUI:**
1. Tải tại https://trufflesuite.com/ganache/
2. Tạo workspace mới, chọn port 7545

**Cách C — Ganache CLI:**
```bash
npm install -g ganache
ganache --port 8545 --chainId 1337
```

### Bước 6: Deploy Smart Contract

```bash
# Với Hardhat node (terminal khác)
npx hardhat run scripts/deploy.js --network localhost

# Với Ganache GUI
npx hardhat run scripts/deploy.js --network ganache

# Với Ganache CLI
npx hardhat run scripts/deploy.js --network ganache_cli
```

Kết quả:
```
🚀 Bắt đầu deploy NhaTro Smart Contract...
📋 Deploying với account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
✅ NhaTro deployed tại: 0x5FbDB2315678afecb367f032d93F642f64180aa3
📦 Thêm phòng mẫu...
  ✔ Đã thêm: Phòng 101 - 0.05 ETH/tháng
  ✔ Đã thêm: Phòng 102 - 0.08 ETH/tháng
  ...
🎉 Deploy hoàn tất!
```

### Bước 7: Cập nhật địa chỉ Contract

Mở file `frontend/src/utils/constants.js` và thay địa chỉ:

```javascript
export const CONTRACT_ADDRESS = "0x<địa_chỉ_từ_bước_6>";
```

### Bước 8: Cài dependencies Frontend

```bash
cd frontend
npm install
```

### Bước 9: Chạy Frontend

```bash
npm run dev
```

Mở trình duyệt tại: **http://localhost:3000**

---

## 🦊 Cài đặt MetaMask

### Thêm Hardhat Local Network vào MetaMask:
1. Mở MetaMask → Settings → Networks → Add Network
2. Điền thông tin:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH

### Thêm Ganache Local Network:
   - **Network Name**: Ganache Local
   - **RPC URL**: http://127.0.0.1:7545 (hoặc 8545 cho CLI)
   - **Chain ID**: 1337
   - **Currency Symbol**: ETH

### Import tài khoản test:
1. Copy private key từ terminal `hardhat node`
2. MetaMask → Import Account → dán private key
3. Account đầu tiên là chủ nhà (owner), các account khác là người thuê

---

## 🎮 Hướng dẫn sử dụng DApp

### Vai trò Chủ nhà (Account #0):
- ✅ Kết nối MetaMask (badge 👑 sẽ hiện)
- ✅ Nhấn **"➕ Thêm phòng"** để thêm phòng mới
- ✅ Xem tất cả phòng trong danh sách
- ✅ Trục xuất người thuê nếu cần

### Vai trò Người thuê (Account #1, #2, ...):
- ✅ Kết nối MetaMask bằng account khác
- ✅ Nhấn **"🔑 Thuê phòng"** trên phòng trống
- ✅ Nhấn **"💳 Thanh toán"** để trả tiền thuê bằng ETH
- ✅ Nhấn **"🚪 Trả phòng"** khi muốn trả

---

## 📋 Smart Contract Functions

| Function | Mô tả | Quyền |
|----------|-------|-------|
| `addRoom(name, price)` | Thêm phòng mới | Chỉ Owner |
| `getRooms()` | Lấy tất cả phòng | Tất cả |
| `getRoom(id)` | Lấy 1 phòng | Tất cả |
| `rentRoom(id)` | Thuê phòng | Non-owner |
| `payRent(id)` | Thanh toán ETH | Chỉ người thuê |
| `vacateRoom(id)` | Trả phòng | Owner/Tenant |
| `isAvailable(id)` | Kiểm tra trạng thái | Tất cả |

---

## 🐛 Xử lý lỗi thường gặp

**"Cannot read properties of undefined"**
→ Chưa compile contract. Chạy: `npx hardhat compile`

**"Transaction reverted"**
→ Kiểm tra đúng account và đủ ETH

**"Network not supported"**
→ Chuyển MetaMask sang Hardhat (31337) hoặc Ganache (1337)

**Phòng không load**
→ Kiểm tra `CONTRACT_ADDRESS` trong `constants.js` đúng chưa

**MetaMask không thấy ETH**
→ Import lại private key từ hardhat node

---

## 🛠 Tech Stack

- **Smart Contract**: Solidity 0.8.19
- **Blockchain Framework**: Hardhat 2.x
- **Testing**: Mocha + Chai
- **Frontend**: React 18 + Vite
- **Web3 Library**: ethers.js v6
- **Wallet**: MetaMask
- **Local Blockchain**: Hardhat Node / Ganache
