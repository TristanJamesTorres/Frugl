import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className='legal-page'>
      <Link href='/' className='text-sm font-medium text-blue-600 hover:underline'>
        ← Back to Frugl home
      </Link>

      <h1 className='text-2xl font-semibold'>Privacy policy</h1>

      <p className='text-sm text-gray-700'>
        Frugl is a marketplace for secondhand laptops. We collect and use the minimum information needed to run the
        marketplace safely and help people list, buy, and message each other.
      </p>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>What we collect</h2>
        <ul className='list-disc space-y-1 pl-5 text-sm text-gray-700'>
          <li>Account details such as your name, email address, and login information.</li>
          <li>Listing information including laptop specs, photos, pricing, and location details.</li>
          <li>Messages and transaction-related communication between buyers and sellers.</li>
          <li>Usage information such as browsing activity, saved listings, and device information needed for security.</li>
        </ul>
      </section>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>How we use it</h2>
        <ul className='list-disc space-y-1 pl-5 text-sm text-gray-700'>
          <li>To create and maintain your account and verify your identity.</li>
          <li>To show and promote listings, offers, and personal messages.</li>
          <li>To keep the marketplace safe by screening suspicious activity, moderation, and fraud prevention.</li>
          <li>To improve the product and customer experience.</li>
        </ul>
      </section>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>Sharing</h2>
        <p className='text-sm text-gray-700'>
          We do not sell your personal information. We may share data with trusted service providers that help us run
          hosting, messaging, authentication, analytics, and moderation services, and we may disclose information when
          required by law or to protect the safety of our users.
        </p>
      </section>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>Your choices</h2>
        <p className='text-sm text-gray-700'>
          You can update your account information, manage saved listings, or permanently delete your account from the
          account settings page. Deleting your account removes your profile, listings and their photos, saved listings,
          offers, conversations and attachments, and reviews. Some safety reports and staff audit records may be
          retained for security purposes. You can also contact us with questions about your personal data.
        </p>
      </section>

      <section className='space-y-2'>
        <h2 className='text-lg font-semibold'>Contact</h2>
        <p className='text-sm text-gray-700'>
          If you have questions about this policy, please contact the Frugl team through the app or the support contact
          configured for the product.
        </p>
      </section>
    </div>
  );
}
