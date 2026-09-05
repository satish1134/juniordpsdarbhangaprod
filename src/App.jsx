import React, { useState, useEffect, useCallback, useMemo, Component } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Toaster } from "./components/ui/toaster";
import { ArrowUp } from "lucide-react";
import HomePage from "./pages/HomePage";
import FeesPage from "./pages/FeesPage";
import CalendarPage from "./pages/CalendarPage";
import CareersPage from "./pages/CareersPage";
import TransportPage from "./pages/TransportPage";
import PolicyPage from "./pages/PolicyPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFoundPage from "./pages/NotFoundPage";
import { ContentProvider } from "./lib/ContentContext";
import ThemeVars from "./components/ThemeVars";
import AdminAccessHotkey from "./components/AdminAccessHotkey";
import { getAdminPath } from "./lib/api";
import { ShieldCheck, FileText } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fbfaf6] flex flex-col items-center justify-center p-6 text-center text-[#0a3d29]">
          <h2 className="font-display text-2xl font-bold mb-3">Something went wrong</h2>
          <p className="text-sm text-[#1c2a24]/70 mb-6 max-w-md">
            We encountered a temporary rendering issue. Please refresh or return to the home page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = "/";
            }}
            className="px-6 py-2.5 rounded-full bg-[#0a5f3d] text-[#fff9e6] font-semibold text-sm hover:bg-[#084a30] transition"
          >
            Reload Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PublicLayout = () => {
  const [showTop, setShowTop] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.getElementById(location.hash.replace("#", ""));
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [location.pathname, location.hash]);

  const scrollToEnquiry = useCallback(() => {
    if (location.pathname !== "/") {
      navigate("/#contact");
    } else {
      const el = document.getElementById("enquiry-form");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      else document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.pathname, navigate]);

  const outletCtx = useMemo(() => ({ scrollToEnquiry }), [scrollToEnquiry]);

  return (
    <>
      <Navbar onEnquiry={scrollToEnquiry} />
      <Outlet context={outletCtx} />
      <Footer />
      <AdminAccessHotkey />
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] flex items-center justify-center shadow-2xl shadow-[#0a3d29]/40 transition-all"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
};

const HomePageWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollToEnquiry = () => {
    const el = document.getElementById("enquiry-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    else document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };
  return <HomePage onEnquiry={scrollToEnquiry} />;
};

function App() {
  const adminPath = getAdminPath();

  return (
    <ErrorBoundary>
      <div className="App">
        <ContentProvider>
          <ThemeVars />
          <BrowserRouter>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePageWrapper />} />
                <Route path="/fees" element={<FeesPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/careers" element={<CareersPage />} />
                <Route path="/transport" element={<TransportPage />} />
                <Route path="/privacy" element={<PolicyPage sectionKey="privacy_policy" fallbackTitle="Privacy Policy" Icon={ShieldCheck} />} />
                <Route path="/terms" element={<PolicyPage sectionKey="terms_of_use" fallbackTitle="Terms of Use" Icon={FileText} />} />
              </Route>

              {/* Obscure Admin URL Routes (Protected, No Public Discovery) */}
              <Route path={`${adminPath}/login`} element={<AdminLogin />} />
              <Route path={adminPath} element={<AdminDashboard />} />

              {/* Strictly block /admin and /admin/* with 404 Not Found */}
              <Route path="/admin" element={<NotFoundPage />} />
              <Route path="/admin/*" element={<NotFoundPage />} />

              {/* Fallback 404 for any other undefined path */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ContentProvider>
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

export default App;
