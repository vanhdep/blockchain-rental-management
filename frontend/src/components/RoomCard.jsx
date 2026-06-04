import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getRoomMeta, getImageUrl } from "../utils/roomApi";

const getPaidKey   = (rid, acc) => `paid_${rid}_${acc?.toLowerCase()}`;
const hasPaidThisMonth = (rid, acc) => {
  try {
    const ts = localStorage.getItem(getPaidKey(rid, acc));
    if (!ts) return false;
    const d = new Date(Number(ts)), now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  } catch { return false; }
};
const markPaidNow = (rid, acc) => {
  try { localStorage.setItem(getPaidKey(rid, acc), Date.now().toString()); } catch {}
};

const FALLBACK_BG = [
  "linear-gradient(135deg,#1A2744,#2C3E6B)",
  "linear-gradient(135deg,#1a3a2a,#2d6b4a)",
  "linear-gradient(135deg,#3a1a1a,#6b2c2c)",
  "linear-gradient(135deg,#2a1a3a,#4a2c6b)",
  "linear-gradient(135deg,#1a2a3a,#2c4a6b)",
  "linear-gradient(135deg,#3a2a1a,#6b4a2c)",
];

export default function RoomCard({
  room, account, isOwner, isConnected,
  onRent, onPayRent, onVacate, loading,
}) {
  const [paying,   setPaying]   = useState(false);
  const [vacating, setVacating] = useState(false);
  const [renting,  setRenting]  = useState(false);
  const [paidThisMonth, setPaidThisMonth] = useState(false);
  const [meta,     setMeta]     = useState(null);  // data từ backend
  const [imgIdx,   setImgIdx]   = useState(0);     // ảnh đang hiển thị

  const isAvailable  = room.status === 0n || room.status === 0;
  const isRented     = !isAvailable;
  const isTenant     = account && room.tenant?.toLowerCase() === account?.toLowerCase();
  const priceEth     = ethers.formatEther(room.pricePerMonth || 0n);
  const totalPaidEth = ethers.formatEther(room.totalPaid || 0n);
  const roomIdStr    = room.roomId?.toString();
  const idx          = Number(room.roomId || 0) % FALLBACK_BG.length;

  // Load metadata từ backend
  useEffect(() => {
    getRoomMeta(roomIdStr).then(setMeta);
  }, [roomIdStr]);

  useEffect(() => {
    if (isTenant && isRented) setPaidThisMonth(hasPaidThisMonth(roomIdStr, account));
  }, [isTenant, isRented, roomIdStr, account]);

  const images  = meta?.images || [];
  const hasImg  = images.length > 0;
  const curImg  = hasImg ? getImageUrl(images[imgIdx]) : null;

  const shortAddr = (addr) =>
    (!addr || addr === ethers.ZeroAddress) ? "—" : `${addr.slice(0,6)}...${addr.slice(-4)}`;

  const formatDate = (ts) =>
    (!ts || ts === 0n || Number(ts) === 0) ? "—" :
    new Date(Number(ts)*1000).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"});

  const now = new Date();
  const thangNam = `Tháng ${now.getMonth()+1}/${now.getFullYear()}`;

  const handleRent    = async () => { setRenting(true);  try { await onRent(room.roomId); }    finally { setRenting(false); } };
  const handlePayRent = async () => {
    setPaying(true);
    try { await onPayRent(room.roomId, room.pricePerMonth); markPaidNow(roomIdStr, account); setPaidThisMonth(true); }
    finally { setPaying(false); }
  };
  const handleVacate  = async () => { setVacating(true); try { await onVacate(room.roomId); }  finally { setVacating(false); } };

  return (
    <div className={`room-card ${isRented ? "rented" : "available"}`}>

      {/* ── Ảnh ── */}
      <div className="room-image" style={{ background: curImg ? undefined : FALLBACK_BG[idx] }}>
        {curImg
          ? <img src={curImg} alt={room.name} className="room-photo" />
          : <>
              <div className="room-image-pattern"></div>
              <div className="room-image-icon">
                {["🏠","🏡","🛏️","🏢","🛋️","🪴"][idx]}
              </div>
            </>
        }

        {/* Điều hướng ảnh */}
        {images.length > 1 && (
          <>
            <button className="img-nav img-nav-prev"
              onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i-1+images.length)%images.length); }}>‹</button>
            <button className="img-nav img-nav-next"
              onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i+1)%images.length); }}>›</button>
            <div className="img-dots">
              {images.map((_,i) => (
                <span key={i} className={`img-dot ${i===imgIdx?"active":""}`}
                  onClick={() => setImgIdx(i)} />
              ))}
            </div>
          </>
        )}

        {/* Badge */}
        <div className="room-badges">
          <span className={`badge ${isAvailable ? "badge-available" : "badge-rented"}`}>
            {isAvailable ? "● Còn trống" : "● Đã thuê"}
          </span>
        </div>

        {/* Giá overlay */}
        <div className="price-overlay">
          <span className="price-overlay-value">{priceEth} ETH</span>
          <span className="price-overlay-sub">/tháng</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="room-body">
        <div className="room-meta-row">
          <span className="room-id-tag">#{roomIdStr?.padStart(3,"0")}</span>
          {meta?.address && <span className="room-address-tag">📍 {meta.address}</span>}
        </div>

        <h3 className="room-name">{room.name}</h3>

        {/* Tiện ích */}
        {meta?.amenities?.length > 0 && (
          <div className="amenity-tags">
            {meta.amenities.slice(0,4).map((a,i) => (
              <span key={i} className="amenity-tag">{a}</span>
            ))}
            {meta.amenities.length > 4 && (
              <span className="amenity-tag more">+{meta.amenities.length-4}</span>
            )}
          </div>
        )}

        {/* Mô tả */}
        {meta?.description && (
          <p className="room-desc">{meta.description}</p>
        )}

        {/* SĐT chủ nhà */}
        {meta?.phone && (
          <a href={`tel:${meta.phone}`} className="room-phone">📞 {meta.phone}</a>
        )}

        {/* Chi tiết thuê */}
        {isRented && (
          <div className="room-details">
            <div className="detail-row">
              <span className="detail-label">👤 Người thuê</span>
              <span className="detail-value">{isTenant ? "✦ Bạn" : shortAddr(room.tenant)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">📅 Từ ngày</span>
              <span className="detail-value">{formatDate(room.rentedAt)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">💰 Đã trả</span>
              <span className="detail-value paid-total">{totalPaidEth} ETH</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {isConnected && (
          <div className="room-actions">
            {isAvailable && !isOwner && (
              <button className="btn btn-rent" onClick={handleRent} disabled={loading||renting}>
                {renting ? "⏳ Đang xử lý..." : "🔑 Thuê ngay"}
              </button>
            )}
            {isRented && isTenant && (
              <>
                {paidThisMonth ? (
                  <div className="paid-this-month">
                    <div className="paid-check">✓</div>
                    <div className="paid-text"><strong>Đã thanh toán</strong><span>{thangNam}</span></div>
                  </div>
                ) : (
                  <button className="btn btn-pay" onClick={handlePayRent} disabled={paying||loading}>
                    {paying ? "⏳ Đang xử lý..." : `💳 Thanh toán ${priceEth} ETH`}
                  </button>
                )}
                <button className="btn btn-vacate" onClick={handleVacate} disabled={vacating||loading}>
                  {vacating ? "⏳..." : "🚪 Trả phòng"}
                </button>
              </>
            )}
            {isRented && isOwner && (
              <button className="btn btn-vacate" onClick={handleVacate} disabled={vacating||loading}>
                {vacating ? "⏳..." : "🚫 Thu hồi phòng"}
              </button>
            )}
            {isAvailable && isOwner && <div className="owner-note">👑 Phòng của bạn</div>}
            {isRented && !isTenant && !isOwner && <div className="rented-note">🔒 Đã có người thuê</div>}
          </div>
        )}
      </div>
    </div>
  );
}