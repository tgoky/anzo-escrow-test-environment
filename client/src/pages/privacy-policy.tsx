import { useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div className="container mx-auto px-4 pt-28 pb-12 max-w-4xl">
      <Link href="/" className="flex items-center text-primary mb-8 hover:underline">
        <ChevronLeft className="mr-2" size={20} />
        Back to Home
      </Link>
      
      <div className="prose prose-gray max-w-none">
        <h1 className="text-4xl font-bold mb-8">Anzo Privacy Policy</h1>
        
        <p className="text-gray-600 mb-6">
          Last updated: March 21, 2025
        </p>
        
        <p>
          This Privacy Policy (the "Policy") explains how Anzo ("Anzo", the "Company", "we", "us", or "our") gathers, utilizes, and 
          distributes data related to the Anzo web application (anzo.app) and all associated offerings, features, and services 
          (the "Services"). Your engagement with the Services is governed by this Policy and our Terms of Service. This document outlines 
          our practices for collecting, using, and sharing your information when you use our Services.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">High Level Summary</h2>
        
        <ul className="list-disc pl-6 mb-6">
          <li>Anzo operates through smart contracts deployed across Layer 1 and Layer 2 blockchain networks.</li>
          <li>We do not gather or retain personal details like your full name, home address, birth date, email, or IP address when you use the Services.</li>
          <li>Authentication is facilitated via an extension that accesses select payment information to enhance user experience in creating zero-knowledge proofs. Only data you explicitly permit is used for this purpose, and payment information remains on your device at all times.</li>
          <li>We may investigate ways to bolster user privacy, such as offering opt-out options, adopting privacy-focused technologies, or using proxies to mask network activity.</li>
          <li>Users are encouraged to explore privacy tools and techniques on their own devices.</li>
          <li>Significant updates to our privacy practices will be documented in a revised policy and published on anzo.app.</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Data We Collect</h2>
        
        <p>
          At Anzo, privacy is a core principle, and transparency is a foundational value. We aim to be clear about the minimal data we collect. 
          We do not create user profiles or store identifiable information like your name or IP address.
        </p>
        
        <p>
          If you contact us directly—via email, customer support, social media platforms (e.g., Twitter or Telegram), or other channels—or 
          participate in surveys or feedback forms, any information you share may be stored on our systems.
        </p>
        
        <p>
          If you voluntarily provide specific data (e.g., generated proofs or related inputs), we may use it for the reasons outlined at the 
          time of submission. We will not attempt to connect this data to your wallet address, IP address, or other personal identifiers. 
          Using our Services does not require submitting personal information.
        </p>
        
        <p>
          To troubleshoot issues in proof generation, we may gather error logs or debugging data using third-party tools (e.g., Rollbar). 
          This includes only essential technical details—like zero-knowledge proofs, smart contract errors, or generic error messages—needed 
          to resolve problems.
        </p>
        
        <p>
          As a seller using the Services, you might opt to share public payment identifiers (e.g., bank username or similar) to receive payments 
          from buyers. We may save these identifiers on our servers to streamline transactions, such as by displaying them to potential buyers. 
          You can request removal of this data anytime by emailing team@anzo.app.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">How We Use Data</h2>
        
        <p>
          We process collected data based on your instructions, our Terms of Service, and legal requirements. Additional uses may include:
        </p>
        
        <ul className="list-disc pl-6 mb-6">
          <li><strong>Delivering the Services.</strong> We use data to operate, maintain, personalize, and enhance our Services and their functionalities.</li>
          <li><strong>Support Services.</strong> Information may be used to assist with inquiries and provide support related to the Services.</li>
          <li><strong>Security Measures.</strong> Data helps us detect, prevent, and address fraud, unauthorized actions, or illegal activities, as well as manage security threats, fix bugs, enforce our policies, and safeguard our users and company.</li>
          <li><strong>Regulatory Compliance.</strong> We may use data to meet obligations set by regulators, government bodies, or law enforcement, as required by law.</li>
          <li><strong>Aggregate Insights.</strong> We might analyze collected data to create anonymized summaries that inform us about user behavior and guide improvements to your experience.</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">How We Share Data</h2>
        
        <p>
          We may disclose collected data in these situations:
        </p>
        
        <ul className="list-disc pl-6 mb-6">
          <li><strong>With Vendors.</strong> We may share data with service providers aiding in the delivery, operation, and enhancement of our Services. For instance, your wallet address might be shared with infrastructure providers like Alchemy, Infura, or Cloudflare, or with blockchain analytics firms to combat financial crime and harmful activities. Social media activity might be shared with our analytics tools to understand your engagement with us.</li>
          <li><strong>Legal Requirements.</strong> Data may be shared during legal proceedings, regulatory actions, or when required by subpoenas, court orders, or similar mandates. We may also share data if we believe it's necessary to prevent harm to users, our company, or others, or to uphold our Terms of Service and policies.</li>
          <li><strong>Security Purposes.</strong> We may share data to investigate and stop fraud, unauthorized use, or illegal acts, and to address security vulnerabilities or enforce our agreements.</li>
          <li><strong>Business Transitions.</strong> Data might be transferred to another entity during a merger, acquisition, bankruptcy, reorganization, or asset sale.</li>
          <li><strong>With Permission.</strong> We'll share data when you explicitly allow us to do so.</li>
        </ul>
        
        <p>
          We do not share your data with third parties for marketing purposes under any circumstances.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Third Party Cookies</h2>
        
        <p>
          We use tools from Google and other providers that employ tracking methods like cookies, device IDs, and local storage to gather data about 
          your use of the Services and interactions with us. You can opt out of this tracking by:
        </p>
        
        <ul className="list-disc pl-6 mb-6">
          <li>Disabling cookies in your browser settings (visit www.allaboutcookies.org for details on managing cookies).</li>
          <li>Limiting advertising IDs in your mobile device settings.</li>
          <li>Using privacy-focused browsers or plug-ins that block third-party trackers.</li>
          <li>Opting out via Google's platform at https://adssettings.google.com (see Google's privacy policy at https://policies.google.com/privacy).</li>
          <li>Using industry opt-out tools at http://optout.aboutads.info and http://optout.networkadvertising.org on each device or browser.</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Third-Party Links and Sites</h2>
        
        <p>
          Our Services may incorporate technologies or links to external websites, platforms, or services we don't control. When you engage with 
          these third parties—including leaving our site—they may independently collect or request data from you. Refer to their privacy policies 
          for details on their data practices.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Security</h2>
        
        <p>
          We maintain reasonable administrative, technical, and physical safeguards to protect data from loss, theft, misuse, unauthorized access, 
          disclosure, alteration, or destruction. However, no internet transmission is entirely secure, and we cannot fully guarantee the safety of 
          your information. You are responsible for securing your blockchain addresses, wallets, and cryptographic keys when using the Services.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Age Requirements</h2>
        
        <p>
          Our Services are designed for a general audience and not aimed at children. We do not knowingly collect personal information (as defined 
          by the U.S. Children's Online Privacy Protection Act, or "COPPA") from children. If you suspect we've received data from someone under 18, 
          contact us at team@anzo.app.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Disclosures for European Union Data Subjects</h2>
        
        <p>
          We process personal data for purposes outlined in "How We Use Data." Our legal bases include: (i) your consent for specific purposes; 
          (ii) necessity for contract performance; (iii) legal compliance; and/or (iv) our legitimate interests, unless your rights override them.
        </p>
        
        <p>
          Under the General Data Protection Regulation ("GDPR"), you may: (i) access or obtain your data; (ii) correct or delete it; (iii) object to 
          or limit its processing; or (iv) request data portability. You can revoke consent anytime, but we cannot alter blockchain-stored data 
          (e.g., transaction records or wallet details), which we don't control. To exercise GDPR rights, email team@anzo.app. We may need more 
          details to process your request and may retain data for legitimate purposes.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Policy</h2>
        
        <p>
          Material changes to this Policy will be announced via the Services. Your continued use of the Services implies you've reviewed and agreed 
          to the updated Policy and terms.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
        
        <p>
          For questions about this Policy or our data practices, reach out to team@anzo.app.
        </p>
      </div>
    </div>
  );
}