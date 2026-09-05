import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminMe, getAdminPath } from "../lib/api";
import { hasValidAdminSession, clearAdminSession } from "../lib/sessionManager";

/**
 * A completely invisible admin access trigger. The public site does NOT
 * expose a "Staff Login" link anywhere. Instead:
 *   - Signed-in admins press Alt+Shift+A on any public page to jump straight
 *     to the admin dashboard.
 *   - Anyone else (i.e., not already signed in) is navigated to admin login.
 */
const AdminAccessHotkey = () => {
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();
  const adminPath = getAdminPath();

  useEffect(() => {
    let alive = true;
    if (!hasValidAdminSession()) {
      setSignedIn(false);
      return;
    }
    adminMe()
      .then(() => alive && setSignedIn(true))
      .catch(() => {
        if (alive) {
          clearAdminSession();
          setSignedIn(false);
        }
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // Alt+Shift+A anywhere on the public site → admin dashboard
      if (e.altKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        const valid = hasValidAdminSession();
        navigate(valid && signedIn ? adminPath : `${adminPath}/login`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, signedIn, adminPath]);

  return null;
};

export default AdminAccessHotkey;
