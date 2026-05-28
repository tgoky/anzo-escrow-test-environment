import { useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";

export default function TermsOfService() {
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
      
      <h1 className="text-3xl font-bold mb-8">Anzo Terms of Service</h1>
      
      <div className="prose prose-green max-w-none">
        <p>
          This Terms of Service document (the "Agreement") outlines the rules and conditions governing your use of the services 
          and offerings provided by us (referred to as "Anzo", "we", "us", or "our"). These offerings, collectively called the "Products," 
          include but are not limited to (a) anzo.app, a web-based platform (the "Platform" or "App"). It is essential that you review 
          this Agreement thoroughly, as it dictates how you may interact with our Products. By engaging with or utilizing our Products, 
          you acknowledge and accept these terms.
        </p>

        <p>
          You also affirm that you are not (a) subject to any economic or trade restrictions imposed or upheld by a governmental body, 
          nor listed on any register of banned or limited parties, or (b) a citizen, resident, or entity formed in a location under 
          broad sanctions. Additionally, you assure us that your use of our Products will adhere to all relevant laws and regulations.
        </p>

        <div className="bg-green-50 p-4 border-l-4 border-green-500 my-6">
          <p className="font-medium">NOTICE:</p>
          <p>
            This Agreement includes key provisions, such as mandatory arbitration and a waiver of class action rights, which affect how 
            disputes are handled. Our Products are available only to those who fully accept these terms—please use them only if you do.
          </p>
        </div>

        <h2 className="text-2xl font-bold mt-8 mb-4">1. Our Products</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">1.1 The Platform</h3>
        <p>
          The Platform offers a web or mobile gateway to (a) a decentralized system operating on various public blockchains, 
          such as Solana, which supports escrow-based exchanges between parties conducting peer-to-peer payment transactions 
          to trade on-chain currencies. The Platform is separate from this underlying system (the "Protocol") and serves as 
          one of several ways to access it. When using the Platform, you acknowledge that transactions are not executed by us, 
          and we do not oversee the Protocol.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">2. Changes to This Agreement or Our Products</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">2.1 Changes to This Agreement</h3>
        <p>
          We may, at our sole discretion, update this Agreement periodically. For significant changes, we'll inform you by 
          revising the date at the top of this document and keeping the latest version available. Updates take effect upon 
          posting, and your ongoing use of any Product signifies your acceptance of those changes. If you reject any updates, 
          you must cease using all of our Products immediately.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">2.2 Changes to Our Products</h3>
        <p>
          We retain the right, though not the obligation, to: (a) alter, replace, remove, or enhance any Product, with or 
          without prior notice; and (b) examine, adjust, restrict, delete, or remove content and data from any Product as we see fit.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">3. Intellectual Property Rights</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">3.1 General IP Rights</h3>
        <p>
          We hold all intellectual property and related rights in our Products and their contents, including software, text, 
          graphics, logos, trademarks, copyrights, patents, designs, and overall appearance. Under this Agreement, we provide 
          you with a limited, revocable, non-exclusive, non-transferable, non-sublicensable license to use our Products solely 
          as permitted here.
        </p>
        
        <p>
          By using our Products (e.g., to list or share content), you grant Anzo a global, non-exclusive, royalty-free, 
          sublicensable license to use, reproduce, adapt, and display any material you submit—such as text, images, files, 
          feedback, or suggestions—for our present and future business needs, including improving and promoting our services.
        </p>
        
        <p>
          You confirm that you possess or have secured all necessary rights, consents, licenses, and authority to grant 
          these permissions for content you share via our Products. You warrant that such material does not infringe copyrights, 
          trademarks, publicity rights, or other intellectual property unless you have lawful permission to use and license it 
          to us, and that it complies with all laws.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">3.2 Third-Party Resources and Offers</h3>
        <p>
          Our Products may link to or mention third-party resources (e.g., information, products, or services) that we neither 
          own nor control. Third parties might also provide offers tied to your use of our Products. We do not review, endorse, 
          or take responsibility for these resources or offers. Engaging with them is at your own risk, and this Agreement does 
          not cover your interactions with third parties.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">3.3 Additional Rights</h3>
        <p>
          We may assist law enforcement, courts, government inquiries, or third parties by sharing information or content 
          you provide, as requested or required.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">4. Your Responsibilities</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">4.1 Prohibited Actions</h3>
        <p>
          You agree not to undertake, or attempt, any of these forbidden activities while using the Platform:
        </p>
        
        <ul>
          <li><strong>IP Violations.</strong> Actions that breach copyrights, trademarks, patents, publicity rights, privacy rights, or other legal proprietary rights.</li>
          <li><strong>Cyber Threats.</strong> Efforts to disrupt or harm the security, integrity, or functionality of any system, network, or device, including deploying malware or launching denial-of-service attacks.</li>
          <li><strong>Deception.</strong> Attempts to mislead us or others, such as submitting false or inaccurate data to illicitly acquire property.</li>
          <li><strong>Market Misconduct.</strong> Actions breaking laws or rules on trading market integrity, like "rug pulls," pump-and-dump schemes, or wash trading.</li>
          <li><strong>Securities Breaches.</strong> Violations of laws on securities or derivatives trading, such as unregistered securities offerings or leveraged commodity products for U.S. retail clients.</li>
          <li><strong>Stolen Goods.</strong> Trading or transferring stolen, fraudulently obtained, or illegally acquired items.</li>
          <li><strong>Data Extraction.</strong> Using data mining, bots, scraping, or similar methods to harvest content or information from our Products.</li>
          <li><strong>Offensive Material.</strong> Sharing harmful, abusive, harassing, violent, defamatory, obscene, hateful, or otherwise objectionable content, or soliciting data from minors under 18.</li>
          <li><strong>Illegal Acts.</strong> Any behavior violating U.S. or other applicable jurisdictional laws or regulations.</li>
        </ul>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">4.2 Trading</h3>
        <p>
          You acknowledge that: (a) trades you initiate via our Products are self-directed and unsolicited; (b) we offer no 
          investment guidance for your trades, including automated ones; and (c) we do not assess the appropriateness of your trades.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">4.3 Non-Custodial Nature and No Fiduciary Role</h3>
        <p>
          Our Products are entirely non-custodial—we never hold, manage, or control your digital assets. You alone manage your 
          wallet's private keys and must never share them. We bear no responsibility for your wallet use and offer no guarantees 
          about how our Products interact with specific wallets. You are fully accountable for your wallet and any issues arising 
          from its compromise.
        </p>
        
        <p>
          This Agreement does not establish fiduciary duties from us to you. To the maximum extent allowed by law, you agree we 
          owe no such duties, and any that might exist are waived and disclaimed. Our only obligations to you are those explicitly 
          listed here.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">4.4 Legal and Tax Duties</h3>
        <p>
          Some Products may not be available or suitable in your area. By using them, you take full responsibility for complying 
          with applicable laws and regulations. Your use of our Products or the Protocol may trigger tax obligations (e.g., income, 
          capital gains, or sales taxes), and you are solely responsible for identifying, reporting, and paying any applicable taxes.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">4.5 Transaction Fees</h3>
        <p>
          Blockchain activities incur network fees ("Gas Fees"). Unless otherwise stated in a specific offer from us, you are 
          responsible for covering Gas Fees for transactions you start via our Products.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">4.6 Liability Waiver</h3>
        <p>
          You accept all risks tied to using our Products and release us from any claims, damages, or liabilities connected to your use.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">5. Disclaimers</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">5.1 Risk Assumption – Overview</h3>
        <p>
          By using our Products, you confirm you are knowledgeable about the financial and technical risks of cryptographic 
          and blockchain systems and have sufficient understanding of digital assets. You recognize that these markets are 
          emerging and volatile due to factors like adoption, speculation, tech issues, security, and regulation.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">5.2 No Guarantees</h3>
        <p>
          Our Products are offered "as is" and "as available." To the fullest extent permitted by law, we disclaim all 
          warranties—express, implied, or statutory—including merchantability and fitness for a specific purpose. Your use 
          is at your own risk. We do not promise uninterrupted, timely, secure, accurate, reliable, or error-free access 
          to our Products, nor that they'll be free of viruses or defects.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">5.3 No Financial Advice</h3>
        <p>
          We may share third-party token data (e.g., rarity scores or lists) or warning labels in our Products. This is for 
          information only—not solicitation or investment advice. We do not recommend any token as a safe or wise investment. 
          You must not rely on this data for decisions, and we offer no opinion on any transaction's merits. You alone decide 
          if an investment suits your goals, finances, and risk tolerance.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">6. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless Anzo, its officers, directors, staff, contractors, agents, 
          affiliates, and subsidiaries from all claims, losses, damages, costs, and expenses stemming from: (a) your use 
          of our Products; (b) your breach of this Agreement, third-party rights, or any law; (c) others using our Products 
          via your device or account; and (d) disputes with other Product users or your own customers.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">7. Limitation of Liability</h2>
        <p>
          Neither we nor our officers, directors, employees, contractors, agents, affiliates, or subsidiaries will be liable for 
          indirect, punitive, incidental, special, or consequential damages—including lost profits, goodwill, data, or intangible 
          losses—arising from your use or inability to use our Products, or from unauthorized access, hacking, or tampering, 
          regardless of legal theory, even if we were aware of potential damages.
        </p>
        
        <p>
          We bear no liability for transaction-related claims or damages from Product use, nor do we offer refunds unless stated. 
          We make no promises about third-party services or their security, and you assume all risks from using them. Our total 
          liability for damages (except where law requires otherwise for personal injury) will not exceed $100 USD or its local 
          equivalent. Some jurisdictions may not allow these limits, so they may not apply to you.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">8. Governing Law and Venue</h2>
        <p>
          This Agreement and your Product use are governed by United Kingdom law, ignoring conflict-of-law principles. 
          Disputes not subject to arbitration or small claims court will be resolved in courts in the United Kingdom.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">9. Miscellaneous</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">9.1 Entire Agreement</h3>
        <p>
          This document is the full agreement between you and us on this subject, replacing all prior agreements or discussions.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">9.2 Assignment</h3>
        <p>
          You may not transfer this Agreement without our written consent; any attempt is void. We may assign it freely, 
          binding successors and assigns.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">9.3 Rewards</h3>
        <p>
          We may offer rewards for certain actions (e.g., transaction milestones). Eligibility details will be in the Product 
          or documentation. If you qualify and comply with terms and laws, we'll aim to deliver rewards to your designated wallet, 
          but we may alter or end reward programs anytime without notice.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">9.4 Not SEC-Registered</h3>
        <p>
          We are not registered with the U.S. SEC as a securities exchange or otherwise. We do not broker trades or guarantee 
          pricing/execution, as trades occur on public blockchains like Solana.
        </p>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">9.5 Notice</h3>
        <p>
          This document supersedes all prior agreements between you and Anzo relating to your use of our Products.
        </p>
      </div>
    </div>
  );
}