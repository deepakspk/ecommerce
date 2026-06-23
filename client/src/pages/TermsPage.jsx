import { useCompanySettings } from "../hooks/useCompanySettings";
import { H1_CLASS, SECTION_HEADING_CLASS, MUTED_CLASS } from "../utils/ui";

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className={`${SECTION_HEADING_CLASS} mb-2`}>{title}</h2>
      <div className="text-sm text-gray-700 space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  const { company } = useCompanySettings();
  const companyName = company?.companyName || "Ecommerce Nepal";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className={`${H1_CLASS} mb-1`}>Terms & Conditions</h1>
      <p className={`${MUTED_CLASS} mb-8`}>Last updated: {new Date().toLocaleDateString("en-NP", { day: "numeric", month: "long", year: "numeric" })}</p>

      <Section title="1. Introduction">
        <p>
          Welcome to {companyName}. These Terms & Conditions govern your use of our website and
          your purchase of products through it. By browsing our site, creating an account, or
          placing an order, you agree to be bound by these terms. If you do not agree, please do
          not use this site.
        </p>
      </Section>

      <Section title="2. Accounts">
        <p>
          You must provide accurate, current information when creating an account and keep your
          login credentials confidential. You are responsible for all activity that occurs under
          your account. Notify us immediately if you suspect unauthorized use.
        </p>
      </Section>

      <Section title="3. Products & Pricing">
        <p>
          We make reasonable efforts to display product details and prices accurately. However,
          errors may occur, availability is not guaranteed, and prices may change without notice.
          We reserve the right to correct pricing errors and to limit or cancel quantities
          purchased.
        </p>
      </Section>

      <Section title="4. Orders & Payment">
        <p>
          Placing an order is an offer to purchase, which we may accept or decline. Payment must
          be completed through one of our supported methods (including Cash on Delivery, eSewa,
          or Khalti) before an order is confirmed, except where Cash on Delivery is selected. We
          may cancel or refuse any order at our discretion, including for suspected fraud.
        </p>
      </Section>

      <Section title="5. Shipping & Delivery">
        <p>
          Delivery timeframes are estimates only and are not guaranteed. Risk of loss and title
          for products pass to you upon delivery to the shipping address provided. Please ensure
          your delivery address and contact details are accurate.
        </p>
      </Section>

      <Section title="6. Returns, Refunds & Cancellations">
        <p>
          Eligible items may be returned within the return window stated on the product or order
          page. Refunds are issued according to our return policy once the returned item is
          received and inspected. Orders may be cancelled prior to shipment, subject to the
          status shown on your account.
        </p>
      </Section>

      <Section title="7. Acceptable Use">
        <p>
          You agree not to misuse the site, including attempting unauthorized access, interfering
          with normal operation, submitting false information, or using the site for any unlawful
          purpose.
        </p>
      </Section>

      <Section title="8. Intellectual Property">
        <p>
          All content on this site, including logos, text, images, and design, is the property of
          {" "}{companyName} or its licensors and may not be copied, reproduced, or distributed
          without prior written permission.
        </p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>
          To the fullest extent permitted by law, {companyName} is not liable for any indirect,
          incidental, or consequential damages arising from your use of the site or products
          purchased through it. Our total liability for any claim is limited to the amount you
          paid for the relevant order.
        </p>
      </Section>

      <Section title="10. Changes to These Terms">
        <p>
          We may update these Terms & Conditions from time to time. Continued use of the site
          after changes are posted constitutes acceptance of the revised terms.
        </p>
      </Section>

      <Section title="11. Governing Law">
        <p>
          These terms are governed by the laws of Nepal, without regard to conflict-of-law
          principles. Any disputes shall be subject to the exclusive jurisdiction of the courts of
          Nepal.
        </p>
      </Section>

      <Section title="12. Contact Us">
        <p>
          If you have questions about these Terms & Conditions, please contact us at{" "}
          {company?.email || "support@ecommercenepal.com"}
          {company?.phone ? ` or ${company.phone}` : ""}.
        </p>
      </Section>
    </div>
  );
}
