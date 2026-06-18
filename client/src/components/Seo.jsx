import { Helmet } from "react-helmet-async";

const SITE_NAME = "Ecommerce Nepal";
const DEFAULT_DESCRIPTION = "Shop quality shirts, pants, and shoes online in Nepal with Cash-on-Delivery.";

export default function Seo({ title, description = DEFAULT_DESCRIPTION, image }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
    </Helmet>
  );
}
