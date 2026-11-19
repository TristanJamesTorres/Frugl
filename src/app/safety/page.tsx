import Link from 'next/link';

export default function SafetyPage() {
  return (
    <div className='legal-page'>
      <Link href='/' className='text-sm font-medium text-blue-600 hover:underline'>
        ← Back to Frugl home
      </Link>

      <h1 className='text-2xl font-semibold'>Safety and rules</h1>

      <section>
        <h2 className='mb-2 font-semibold'>Meet-up and handover tips</h2>
        <ul className='list-disc space-y-1 pl-5 text-sm'>
          <li>Meet in a busy public place in daylight, such as a mall or a cafe, and bring a friend.</li>
          <li>Power on and test the laptop before you pay: screen, keyboard, ports, battery and charger.</li>
          <li>Check that the serial number on the laptop matches the listing, and that the laptop is not locked to another account.</li>
          <li>Never pay a deposit or reservation fee, and never share a one-time password (OTP) or verification code.</li>
          <li>Agree on payment and handover in the chat before meeting. Be careful with anyone who refuses to meet.</li>
        </ul>
      </section>

      <section>
        <h2 className='mb-2 font-semibold'>Prohibited listings</h2>
        <ul className='list-disc space-y-1 pl-5 text-sm'>
          <li>Stolen, counterfeit or account-locked laptops.</li>
          <li>Anything that is not a laptop, and listings with false specs or photos that are not your own.</li>
          <li>Illegal software or items that break the law.</li>
        </ul>
      </section>

      <p className='text-sm text-gray-500'>See a problem? Use the Report button on a listing and the Frugl admin team will review it.</p>
    </div>
  );
}
