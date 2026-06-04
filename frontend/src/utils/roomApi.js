// src/utils/roomApi.js
// Gọi backend để lấy/lưu metadata phòng (ảnh, mô tả, địa chỉ, SĐT)

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Lấy metadata 1 phòng ──
export const getRoomMeta = async (roomId) => {
  try {
    const res = await fetch(`${BASE_URL}/api/rooms/${roomId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
};

// ── Lấy metadata nhiều phòng cùng lúc ──
export const getAllRoomMeta = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/rooms`);
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
};

// ── Lưu thông tin phòng (mô tả, tiện ích, địa chỉ, SĐT) ──
export const saveRoomInfo = async (roomId, { description, amenities, address, phone }) => {
  try {
    const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/info`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ description, amenities, address, phone }),
    });
    return await res.json();
  } catch (err) {
    console.error("saveRoomInfo error:", err);
    return null;
  }
};

// ── Upload ảnh phòng ──
export const uploadRoomImages = async (roomId, files) => {
  try {
    const formData = new FormData();
    files.forEach(f => formData.append("images", f));

    const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/images`, {
      method: "POST",
      body:   formData,
      // KHÔNG set Content-Type, để browser tự set multipart/form-data
    });
    return await res.json();
  } catch (err) {
    console.error("uploadRoomImages error:", err);
    return null;
  }
};

// ── Xóa ảnh phòng ──
export const deleteRoomImage = async (roomId, filename) => {
  try {
    const res = await fetch(`${BASE_URL}/api/rooms/${roomId}/images`, {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ filename }),
    });
    return await res.json();
  } catch (err) {
    console.error("deleteRoomImage error:", err);
    return null;
  }
};

// ── Helper: lấy full URL ảnh ──
export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
};