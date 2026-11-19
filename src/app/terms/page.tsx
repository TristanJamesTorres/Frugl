import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className='legal-page'>
      <Link href='/' className='text-sm font-medium text-blue-600 hover:underline'>
        ← Back to Frugl home
      </Link>

      <h1 className='text-2xl font-semibold'>Terms of service</h1>

      <p className='text-sm text-gray-700'>
        These terms govern your use of Frugl. By using the platform, you agree to follow the rules for buying,
        selling, and communicating about secondhand laptops.
      </p>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>Use of the platform</h2>
        <ul className='list-disc space-y-1 pl-5 text-sm text-gray-700'>
          <li>You must provide accurate information and only list laptops you are authorized to sell.</li>
          <li>You are responsible for the content you post, including descriptions, photos, and pricing.</li>
          <li>Use the marketplace honestly and respectfully. Do not harass, scam, or mislead other users.</li>
        </ul>
      </section>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>Transactions</h2>
        <p className='text-sm text-gray-700'>
          Frugl helps connect buyers and sellers, but we are not a party to individual transactions. Buyers and sellers
          are responsible for meeting safely, confirming the condition of the laptop, and arranging secure payment.
        </p>
      </section>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>Prohibited conduct</h2>
        <ul className='list-disc space-y-1 pl-5 text-sm text-gray-700'>
          <li>Listing stolen, counterfeit, or misrepresented devices.</li>
          <li>Fraudulent payment activity, spam, impersonation, or abusive communication.</li>
          <li>Violating local laws or platform safety rules.</li>
        </ul>
      </section>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>Moderation</h2>
        <p className='text-sm text-gray-700'>
          Frugl may remove listings, suspend accounts, or restrict access when required to protect the community and the
          integrity of the marketplace.
        </p>
      </section>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>Changes</h2>
        <p className='text-sm text-gray-700'>
          We may update these terms over time. Continued use of Frugl after updates means you accept the revised terms.
        </p>
      </section>
    </div>
  );
}
