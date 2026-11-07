import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";

const ROOT_PATHS = new Set(["/", "/today", "/welcome"]);

/**
 * Overrides Android's default back-button behavior (which would kill the app):
 * - on a root route → send the app to the background gracefully
 * - anywhere else → go back one step in router history
 */
export default function BackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let handler: { remove: () => void } | undefined;

    CapApp.addListener("backButton", () => {
      if (ROOT_PATHS.has(location.pathname)) {
        void CapApp.minimizeApp();
      } else {
        navigate(-1);
      }
    }).then((h) => {
      handler = h;
    });

    return () => {
      handler?.remove();
    };
  }, [location.pathname, navigate]);

  return null;
}
