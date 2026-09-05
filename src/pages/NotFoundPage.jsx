import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Compass, ShieldAlert } from "lucide-react";
import { Button } from "../components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#072418] text-[#fff9e6] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="blob w-[500px] h-[500px] bg-[#c99f3b] -top-32 -right-32 opacity-20" />
      <div className="blob w-[450px] h-[450px] bg-[#167a51] -bottom-32 -left-32 opacity-30" />

      <div className="relative max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#c99f3b]/15 border border-[#c99f3b]/30 flex items-center justify-center">
          <Compass className="w-10 h-10 text-[#c99f3b]" />
        </div>

        <div className="space-y-2">
          <span className="text-[12px] font-mono tracking-[0.3em] uppercase text-[#c99f3b] font-semibold">
            Error 404
          </span>
          <h1 className="font-display text-4xl font-bold tracking-tight text-[#fff9e6]">
            Page Not Found
          </h1>
          <p className="text-[14px] text-[#fff9e6]/70 leading-relaxed max-w-sm mx-auto">
            The page you are looking for doesn't exist, has been removed, or is inaccessible.
          </p>
        </div>

        <div className="pt-2">
          <Link to="/">
            <Button className="bg-[#c99f3b] hover:bg-[#b58e32] text-[#072418] font-semibold rounded-full px-6 h-11 shadow-lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
