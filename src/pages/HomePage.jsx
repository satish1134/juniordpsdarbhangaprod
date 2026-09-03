import React from "react";
import Hero from "../components/Hero";
import MarqueeBand from "../components/MarqueeBand";
import About from "../components/About";
import MissionVisionPurpose from "../components/MissionVisionPurpose";
import Academics from "../components/Academics";
import Facilities from "../components/Facilities";
import Gallery from "../components/Gallery";
import AwardsSection from "../components/AwardsSection";
import NewsTestimonials from "../components/NewsTestimonials";
import MobileAppSection from "../components/MobileAppSection";
import BrochureBand from "../components/BrochureBand";
import Admissions from "../components/Admissions";
import Curriculum from "../components/Curriculum";
import CurrentNotices from "../components/CurrentNotices";
import Contact from "../components/Contact";

const HomePage = ({ onEnquiry }) => {
  return (
    <>
      <Hero onEnquiry={onEnquiry} />
      <MarqueeBand />
      <About />
      <MissionVisionPurpose />
      <Academics />
      <Facilities />
      <Gallery />
      <AwardsSection />
      <NewsTestimonials />
      <MobileAppSection />
      <BrochureBand />
      <Admissions onEnquiry={onEnquiry} />
      <Curriculum />
      <CurrentNotices />
      <Contact />
    </>
  );
};

export default HomePage;
