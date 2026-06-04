import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Header from "./components/Header";
import RoomCard from "./components/RoomCard";
import AddRoomModal from "./components/AddRoomModal";
import Toast from "./components/Toast";
import { useContract } from "./utils/useContract";
import { saveRoomInfo, uploadRoomImages } from "./utils/roomApi";
import "./App.css";

export default function App() {
  const { contract, account, isOwner, isConnected, networkName,
    error: walletError, connectWallet, disconnectWallet } = useContract();

  const [rooms, setRooms]                 = useState([]);
  const [loadingRooms, setLoadingRooms]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [toasts, setToasts]               = useState([]);
  const [filter, setFilter]               = useState("all");
  const [search, setSearch]               = useState("");

  const addToast = useCallback((msg, type="info") => {
    setToasts(p => [...p, { id: Date.now()+Math.random(), message: msg, type }]);
  }, []);
  const removeToast = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  const loadRooms = useCallback(async () => {
    if (!contract) return;
    try { setLoadingRooms(true); setRooms(await contract.getRooms()); }
    catch { addToast("Không thể tải danh sách phòng", "error"); }
    finally { setLoadingRooms(false); }
  }, [contract, addToast]);

  useEffect(() => {
    if (!contract) return;
    loadRooms();
    const onAdded   = (id,name) => { addToast(`🏠 Phòng "${name}" đã được đăng`, "success"); loadRooms(); };
    const onRented  = (id)      => { addToast(`🔑 Phòng #${id} đã được thuê`, "info"); loadRooms(); };
    const onPaid    = (id,_,amt)=> { addToast(`💰 Thanh toán ${ethers.formatEther(amt)} ETH thành công`, "success"); loadRooms(); };
    const onVacated = (id)      => { addToast(`🚪 Phòng #${id} đã được trả`, "info"); loadRooms(); };
    contract.on("RoomAdded",onAdded); contract.on("RoomRented",onRented);
    contract.on("RentPaid",onPaid);   contract.on("RoomVacated",onVacated);
    return () => {
      contract.off("RoomAdded",onAdded); contract.off("RoomRented",onRented);
      contract.off("RentPaid",onPaid);   contract.off("RoomVacated",onVacated);
    };
  }, [contract, loadRooms, addToast]);

  useEffect(() => { if (walletError) addToast(walletError, "error"); }, [walletError, addToast]);

  const parseError = (err) => {
    if (err?.reason) return err.reason;
    if (err?.message?.includes("user rejected")||err?.code===4001) return "Bạn đã từ chối giao dịch";
    if (err?.message?.includes("insufficient funds")) return "Số dư không đủ";
    return err?.message?.slice(0,120) || "Có lỗi xảy ra";
  };

  const handleAddRoom = async (name, priceWei, imgFiles, meta) => {
    try {
      setActionLoading(true);
      const tx = await contract.addRoom(name, priceWei);
      addToast("⏳ Đang xử lý giao dịch...", "info");
      const receipt = await tx.wait();
      // Lấy roomId từ event
      let newRoomId = rooms.length + 1;
      try {
        const ev = receipt.logs?.find(l => {
          try { return contract.interface.parseLog(l)?.name === "RoomAdded"; } catch { return false; }
        });
        if (ev) newRoomId = Number(contract.interface.parseLog(ev).args[0]);
      } catch {}
      // Lưu backend
      await saveRoomInfo(newRoomId, meta);
      if (imgFiles?.length > 0) await uploadRoomImages(newRoomId, imgFiles);
      addToast(`✅ Đăng phòng "${name}" thành công!`, "success");
    } catch (err) { addToast(`❌ ${parseError(err)}`, "error"); throw err; }
    finally { setActionLoading(false); }
  };

  const handleRentRoom  = async (id) => {
    try { setActionLoading(true); const tx = await contract.rentRoom(id);  addToast("⏳ Đang xử lý...", "info"); await tx.wait(); addToast(`✅ Thuê phòng #${id} thành công!`, "success"); }
    catch (err) { addToast(`❌ ${parseError(err)}`, "error"); } finally { setActionLoading(false); }
  };
  const handlePayRent   = async (id, wei) => {
    try { setActionLoading(true); const tx = await contract.payRent(id,{value:wei}); addToast("⏳ Đang xử lý...", "info"); await tx.wait(); addToast(`✅ Thanh toán ${ethers.formatEther(wei)} ETH!`, "success"); }
    catch (err) { addToast(`❌ ${parseError(err)}`, "error"); } finally { setActionLoading(false); }
  };
  const handleVacate    = async (id) => {
    try { setActionLoading(true); const tx = await contract.vacateRoom(id); addToast("⏳ Đang xử lý...", "info"); await tx.wait(); addToast(`✅ Trả phòng #${id} thành công!`, "success"); }
    catch (err) { addToast(`❌ ${parseError(err)}`, "error"); } finally { setActionLoading(false); }
  };

  const availableCount = rooms.filter(r => r.status===0n||r.status===0).length;
  const rentedCount    = rooms.length - availableCount;

  const filtered = rooms.filter(r => {
    const matchFilter = filter==="available" ? (r.status===0n||r.status===0)
                      : filter==="rented"    ? (r.status===1n||r.status===1) : true;
    const matchSearch = search ? r.name?.toLowerCase().includes(search.toLowerCase()) : true;
    return matchFilter && matchSearch;
  });

  return (
    <div className="app">
      {/* Top bar */}
      <div className="topbar">
        🏠 Chào mừng đến với <span>NhaTro Chain</span> — Hệ thống thuê phòng trọ trên Blockchain
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-logo">🏠</div>
            <div className="brand-text">
              <h1>NhaTro Chain</h1>
              <p>Blockchain · Minh bạch</p>
            </div>
          </div>

          {/* Search */}
          <div className="header-search">
            <input
              type="text"
              placeholder="🔍  Tìm kiếm phòng trọ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="search-btn">🔍</button>
          </div>

          <div className="header-right">
            {isConnected && networkName && (
              <div className="network-badge"><span className="dot"></span>{networkName}</div>
            )}
            {isConnected ? (
              <div className="wallet-info">
                {isOwner && <span className="owner-badge">👑 Chủ nhà</span>}
                <button className="btn-wallet connected" onClick={disconnectWallet}>
                  <span className="wallet-icon">🦊</span>
                  {account ? `${account.slice(0,6)}...${account.slice(-4)}` : ""}
                </button>
              </div>
            ) : (
              <button className="btn-wallet" onClick={connectWallet}>
                <span className="wallet-icon">🦊</span>Kết nối MetaMask
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <span className="nav-item active">🏠 Tất cả phòng</span>
          <span className="nav-sep">|</span>
          <span className="nav-item" onClick={() => setFilter("available")}>✅ Còn trống</span>
          <span className="nav-sep">|</span>
          <span className="nav-item" onClick={() => setFilter("rented")}>🔑 Đã thuê</span>
          {isOwner && <><span className="nav-sep">|</span>
          <span className="nav-item" onClick={() => setShowAddModal(true)}>➕ Đăng phòng mới</span></>}
        </div>
      </nav>

      <main className="main">
        {/* HERO */}
        {!isConnected && (
          <div className="hero">
            <div className="hero-content">
              <div className="hero-tag">🔥 Nền tảng thuê phòng Blockchain</div>
              <h2>Tìm phòng trọ<br /><span>nhanh · rẻ · an toàn</span></h2>
              <p>Hệ thống phi tập trung trên Ethereum. Thuê phòng và thanh toán trực tiếp bằng ETH — không trung gian, minh bạch 100%.</p>
              <div className="hero-btns">
                <button className="btn-connect-hero" onClick={connectWallet}>
                  🦊 Kết nối MetaMask ngay
                </button>
                <span className="hero-note">⚡ Kết nối trong 30 giây</span>
              </div>
              <div className="hero-features">
                <span>🔒 An toàn</span><span>⚡ Tức thì</span>
                <span>🌐 Phi tập trung</span><span>💎 Minh bạch</span><span>📜 Smart Contract</span>
              </div>
            </div>
            <div className="hero-visual">🏘️</div>
          </div>
        )}

        {isConnected && (
          <>
            {/* Banner */}
            <div className="hero" style={{minHeight:"unset", padding:"36px 40px", marginBottom:"20px"}}>
              <div className="hero-content">
                <div className="hero-tag">🏠 {isOwner ? "Quản lý nhà trọ" : "Tìm phòng trọ"}</div>
                <h2>{isOwner ? "Quản lý & cho thuê<br/>" : "Tìm phòng trọ "}<span>{isOwner ? "phòng trọ của bạn" : "giá tốt hôm nay"}</span></h2>
                <div className="hero-features">
                  <span>🏘️ {rooms.length} phòng</span>
                  <span>✅ {availableCount} còn trống</span>
                  <span>🔑 {rentedCount} đã thuê</span>
                </div>
              </div>
              <div className="hero-visual" style={{fontSize:"80px"}}>🏠</div>
            </div>

            {/* Promo banners */}
            <div className="promo-row">
              <div className="promo-card orange">
                <span className="promo-icon">⚡</span>
                <div className="promo-text"><strong>Thanh toán tức thì</strong><span>Chuyển ETH trực tiếp, không qua trung gian</span></div>
              </div>
              <div className="promo-card blue">
                <span className="promo-icon">🔒</span>
                <div className="promo-text"><strong>Hợp đồng thông minh</strong><span>Mọi giao dịch được ghi trên Blockchain</span></div>
              </div>
              <div className="promo-card green">
                <span className="promo-icon">💎</span>
                <div className="promo-text"><strong>Minh bạch 100%</strong><span>Không ai có thể thay đổi lịch sử giao dịch</span></div>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-bar">
              <div className="stat"><span className="stat-icon">🏘️</span><span className="stat-number">{rooms.length}</span><span className="stat-label">Tổng phòng</span></div>
              <div className="stat"><span className="stat-icon">✅</span><span className="stat-number available">{availableCount}</span><span className="stat-label">Còn trống</span></div>
              <div className="stat"><span className="stat-icon">🔑</span><span className="stat-number rented">{rentedCount}</span><span className="stat-label">Đã thuê</span></div>
            </div>

            {/* Section header + toolbar */}
            <div className="section-header">
              <div className="section-title">
                <div className="section-title-bar"></div>
                <h2>Danh sách phòng trọ</h2>
              </div>
            </div>

            <div className="toolbar">
              <div className="filter-tabs">
                {[{key:"all",label:`Tất cả (${rooms.length})`},{key:"available",label:`Còn trống (${availableCount})`},{key:"rented",label:`Đã thuê (${rentedCount})`}]
                  .map(t => <button key={t.key} className={`filter-tab ${filter===t.key?"active":""}`} onClick={()=>setFilter(t.key)}>{t.label}</button>)}
              </div>
              <div className="toolbar-right">
                <button className="btn-refresh" onClick={loadRooms} disabled={loadingRooms}>{loadingRooms?"⏳":"↻"} Làm mới</button>
                {isOwner && <button className="btn-add-room" onClick={()=>setShowAddModal(true)}>＋ Đăng phòng</button>}
              </div>
            </div>

            {/* Grid */}
            {loadingRooms ? (
              <div className="loading-state"><div className="spinner"></div><p>Đang tải...</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏚️</div>
                <h3>{rooms.length===0 ? "Chưa có phòng nào" : "Không tìm thấy phòng phù hợp"}</h3>
                {isOwner && rooms.length===0 && <button className="btn-add-room" onClick={()=>setShowAddModal(true)}>＋ Đăng phòng đầu tiên</button>}
              </div>
            ) : (
              <div className="rooms-grid">
                {filtered.map(room => (
                  <RoomCard key={room.roomId?.toString()} room={room}
                    account={account} isOwner={isOwner} isConnected={isConnected}
                    onRent={handleRentRoom} onPayRent={handlePayRent}
                    onVacate={handleVacate} loading={actionLoading} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <h3>🏠 NhaTro Chain</h3>
            <p>Hệ thống quản lý nhà trọ phi tập trung trên nền tảng Ethereum Blockchain. An toàn, minh bạch, không trung gian.</p>
          </div>
          <div className="footer-col">
            <h4>Dịch vụ</h4>
            <ul>
              <li>Thuê phòng trọ</li>
              <li>Thanh toán ETH</li>
              <li>Quản lý hợp đồng</li>
              <li>Lịch sử giao dịch</li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Hỗ trợ</h4>
            <ul>
              <li>Hướng dẫn sử dụng</li>
              <li>Cài MetaMask</li>
              <li>Kết nối Ganache</li>
              <li>Liên hệ hỗ trợ</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 <span>NhaTro Chain</span> — Xây dựng trên Ethereum Blockchain
        </div>
      </footer>

      {showAddModal && (
        <AddRoomModal onAdd={handleAddRoom} onClose={()=>setShowAddModal(false)}
          loading={actionLoading} nextRoomId={rooms.length+1} />
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}