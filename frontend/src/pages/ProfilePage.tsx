import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import apiService from "../services/api";

export default function ProfilePage() {
  const { user, setTokenAndFetch } = useAuth();
  
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setUsername(user.username || "");
      setPhoneNumber(user.phone_number || "");
      // Get absolute URL for local avatars if it's a relative path
      const avatarStr = user.avatar_url;
      if (avatarStr && avatarStr.startsWith('/static')) {
          setPreviewUrl(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${avatarStr}`);
      } else {
          setPreviewUrl(avatarStr || null);
      }
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      let submitData: any = {
        display_name: displayName,
        username: username,
        phone_number: phoneNumber,
      };

      // If an avatar file is selected, we MUST use FormData
      if (avatarFile) {
        const formData = new FormData();
        formData.append("display_name", displayName);
        formData.append("username", username);
        formData.append("phone_number", phoneNumber);
        formData.append("avatar", avatarFile);
        submitData = formData;
      }

      await apiService.updateProfile(submitData);
      
      // Refresh user context
      const token = localStorage.getItem("indai_token");
      if (token) {
        await setTokenAndFetch(token);
      }
      
      setSuccessMsg("Profile updated successfully!");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-page page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Manage your account information</p>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-card dashboard-card">
          <div className="profile-header">
            <div className="profile-avatar-container" onClick={() => document.getElementById('avatar-upload')?.click()}>
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar" className="profile-avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="profile-avatar profile-avatar-placeholder">
                  {user?.display_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <div className="profile-avatar-overlay">
                <span>Change Picture</span>
              </div>
            </div>
            
            <input 
              type="file" 
              id="avatar-upload" 
              accept="image/*" 
              style={{ display: "none" }} 
              onChange={handleAvatarChange} 
            />

            <div className="profile-info-header">
              <h2>{user?.username || user?.email.split("@")[0]}</h2>
              <p>{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            {successMsg && <div className="alert-success">{successMsg}</div>}
            {errorMsg && <div className="alert-error">{errorMsg}</div>}

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Enter your username"
              />
            </div>

            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="form-input"
                placeholder="Enter your display name"
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="form-input"
                placeholder="Enter your contact number"
              />
              <span className="form-help">Optional. Used for account recovery and notifications.</span>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
