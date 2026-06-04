import React, { useState, useRef } from "react";
import { ethers } from "ethers";

const AMENITY_OPTIONS = [
  { id: "wifi",     label: "WiFi",       icon: "📶" },
  { id: "ac",       label: "Điều hòa",   icon: "❄️" },
  { id: "wc",       label: "WC riêng",   icon: "🚿" },
  { id: "parking",  label: "Chỗ để xe",  icon: "🏍️" },
  { id: "kitchen",  label: "Bếp",        icon: "🍳" },
  { id: "balcony",  label: "Ban công",   icon: "🌿" },
  { id: "washer",   label: "Máy giặt",   icon: "👕" },
  { id: "security", label: "Bảo vệ",     icon: "🔐" },
];

export default function AddRoomModal({ onAdd, onClose, loading }) {
  const [step, setStep]           = useState(1);
  const [name, setName]           = useState("");
  const [price, setPrice]         = useState("");
  const [address, setAddress]     = useState("");
  const [phone, setPhone]         = useState("");
  const [description, setDesc]    = useState("");
  const [amenities, setAmenities] = useState([]);
  const [images, setImages]       = useState([]);
  const [previews, setPreviews]   = useState([]);
  const [dragOver, setDragOver]   = useState(false);
  const [error, setError]         = useState("");
  const fileRef = useRef();

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(
      f => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024
    );
    if (!valid.length) { setError("File không hợp lệ hoặc > 5MB"); return; }
    const merged = [...images, ...valid].slice(0, 5);
    setImages(merged);
    merged.forEach((f, i) => {
      const r = new FileReader();
      r.onload = e => setPreviews(p => { const n=[...p]; n[i]=e.target.result; return n; });
      r.readAsDataURL(f);
    });
    setError("");
  };

  const removeImage = (i) => {
    setImages(imgs => imgs.filter((_,idx) => idx !== i));
    setPreviews(ps  => ps.filter((_,idx) => idx !== i));
  };

  const toggleAmenity = (id) =>
    setAmenities(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

  // Bước 1: validate thông tin cơ bản
  const handleStep1 = (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim())                    { setError("Vui lòng nhập tên phòng"); return; }
    if (!price || parseFloat(price) <= 0){ setError("Giá thuê phải lớn hơn 0"); return; }
    if (!address.trim())                 { setError("Vui lòng nhập địa chỉ"); return; }
    if (!phone.trim())                   { setError("Vui lòng nhập số điện thoại"); return; }
    setStep(2);
  };

  // Bước 2: gọi onAdd với đủ tham số
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const priceWei = ethers.parseEther(price);
      const meta = {
        description,
        amenities: amenities.map(id => AMENITY_OPTIONS.find(o=>o.id===id)?.label || id),
        address,
        phone,
      };
      // Gọi onAdd(name, priceWei, imgFiles, meta)
      await onAdd(name.trim(), priceWei, images, meta);
      onClose();
    } catch (err) {
      // lỗi đã toast bên App.jsx
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🏠</span>
            <div>
              <h2>Đăng phòng cho thuê</h2>
              <p className="modal-subtitle">Bước {step}/2 — {step===1 ? "Thông tin cơ bản" : "Ảnh & mô tả"}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator */}
        <div className="step-bar">
          <div className={`step-item ${step>=1?"active":""}`}>
            <div className="step-dot">1</div><span>Thông tin</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step>=2?"active":""}`}>
            <div className="step-dot">2</div><span>Ảnh & Mô tả</span>
          </div>
        </div>

        {/* ── BƯỚC 1 ── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label>Tên phòng *</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)}
                  placeholder="Phòng 101, Phòng A1..." maxLength={50} autoFocus />
              </div>
              <div className="form-group">
                <label>Giá thuê / tháng (ETH) *</label>
                <div className="input-with-unit">
                  <input type="number" value={price} onChange={e=>setPrice(e.target.value)}
                    placeholder="0.05" step="0.001" min="0.001" />
                  <span className="input-unit">ETH</span>
                </div>
                {price && parseFloat(price) > 0 && (
                  <small className="price-hint">≈ {parseFloat(price).toFixed(4)} ETH/tháng</small>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Địa chỉ *</label>
              <input type="text" value={address} onChange={e=>setAddress(e.target.value)}
                placeholder="123 Nguyễn Văn A, Quận 1, TP.HCM" />
            </div>

            <div className="form-group">
              <label>Số điện thoại chủ nhà *</label>
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
                placeholder="0912 345 678" />
            </div>

            {error && <div className="form-error">⚠️ {error}</div>}

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn-confirm">Tiếp theo →</button>
            </div>
          </form>
        )}

        {/* ── BƯỚC 2 ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="modal-form">
            {/* Upload ảnh */}
            <div className="form-group">
              <label>Ảnh phòng (tối đa 5 ảnh)</label>
              {previews.length > 0 ? (
                <div className="img-preview-grid">
                  {previews.map((src, i) => (
                    <div key={i} className="img-preview-item">
                      <img src={src} alt="" />
                      <button type="button" className="img-remove" onClick={()=>removeImage(i)}>✕</button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <div className="img-add-more" onClick={()=>fileRef.current.click()}>＋</div>
                  )}
                </div>
              ) : (
                <div
                  className={`upload-zone ${dragOver?"drag-over":""}`}
                  onClick={()=>fileRef.current.click()}
                  onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files)}}
                  onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                  onDragLeave={()=>setDragOver(false)}
                >
                  <div className="upload-placeholder">
                    <div className="upload-icon">📸</div>
                    <p className="upload-text">Kéo thả hoặc <span>chọn ảnh</span></p>
                    <p className="upload-hint">JPG, PNG, WEBP · Mỗi ảnh tối đa 5MB</p>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple
                style={{display:"none"}} onChange={e=>handleFiles(e.target.files)} />
            </div>

            {/* Tiện ích */}
            <div className="form-group">
              <label>Tiện ích</label>
              <div className="amenity-grid">
                {AMENITY_OPTIONS.map(opt => (
                  <button key={opt.id} type="button"
                    className={`amenity-btn ${amenities.includes(opt.id)?"selected":""}`}
                    onClick={()=>toggleAmenity(opt.id)}>
                    <span>{opt.icon}</span><span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mô tả */}
            <div className="form-group">
              <label>Mô tả phòng</label>
              <textarea value={description} onChange={e=>setDesc(e.target.value)}
                placeholder="Phòng sạch sẽ, thoáng mát, gần chợ..." rows={3} maxLength={500} />
              <small className="char-count">{description.length}/500</small>
            </div>

            {error && <div className="form-error">⚠️ {error}</div>}

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={()=>setStep(1)}>← Quay lại</button>
              <button type="submit" className="btn-confirm" disabled={loading}>
                {loading ? "⏳ Đang đăng..." : "🏠 Đăng phòng"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}