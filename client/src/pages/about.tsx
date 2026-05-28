import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function About() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div className="container mx-auto px-4 pt-28 pb-12 max-w-5xl">
      <Link href="/" className="flex items-center text-primary mb-8 hover:underline">
        <ChevronLeft className="mr-2" size={20} />
        Back to Home
      </Link>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="prose prose-gray max-w-none"
      >
        <h1 className="text-4xl font-bold mb-8">About Anzo Labs</h1>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
            <p className="text-gray-600">
              Anzo Labs is a pioneering cryptocurrency exchange built on the Solana blockchain. 
              Our mission is to create a secure, transparent, and accessible platform for trading 
              digital assets with an exceptional user experience.
            </p>
            <p className="text-gray-600 mt-4">
              We're committed to bridging the gap between traditional financial systems and 
              decentralized finance, making crypto accessible to everyone.
            </p>
          </section>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Technology</h2>
            <p className="text-gray-600">
              Built on Solana's high-performance blockchain, our platform offers:
            </p>
            <ul className="list-disc pl-6 mt-4 text-gray-600">
              <li>Lightning-fast transaction processing</li>
              <li>Minimal fees compared to traditional exchanges</li>
              <li>Secure and transparent trading environment</li>
              <li>Seamless integration with major wallets and financial services</li>
              <li>Innovative peer-to-peer marketplace for direct trading</li>
            </ul>
          </section>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Commitment</h2>
            <p className="text-gray-600">
              At Anzo Labs, we're dedicated to:
            </p>
            <ul className="list-disc pl-6 mt-4 text-gray-600">
              <li>Maintaining the highest standards of security</li>
              <li>Delivering an intuitive user experience</li>
              <li>Continuously innovating our platform</li>
              <li>Fostering an inclusive and supportive community</li>
              <li>Promoting responsible trading practices</li>
            </ul>
          </section>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          className="bg-gray-50 p-8 rounded-2xl mt-12"
        >
          <h2 className="text-2xl font-semibold mb-4">Join Us</h2>
          <p className="text-gray-600">
            Whether you're an experienced trader or new to cryptocurrency, Anzo Labs provides the 
            tools and resources you need to succeed in the digital economy. Join our community today 
            and be part of the future of finance.
          </p>
          <div className="mt-6">
            <Link href="/">
              <Button className="bg-[#BCE704] hover:bg-[#a5cc02] text-black">
                Start Trading
              </Button>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}