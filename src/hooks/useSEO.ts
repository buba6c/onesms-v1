import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SEOProps {
  titleKey?: string;       // Key in translation files, e.g. 'auth.loginTitle'
  titleLiteral?: string;   // Fallback literal title if no key exists
  descriptionKey?: string; // Key for meta description
  descriptionLiteral?: string;
  image?: string; // Open Graph / Twitter image URL
  structuredData?: Record<string, any>; // JSON-LD object
}

export function useSEO({
  titleKey,
  titleLiteral,
  descriptionKey,
  descriptionLiteral,
  image,
  structuredData,
}: SEOProps) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // 1. Resolve Title
    let resolvedTitle = '';
    if (titleKey) {
      const translated = t(titleKey);
      // If the translation returns the key itself, fallback to literal or default
      if (translated && translated !== titleKey) {
        resolvedTitle = translated;
      }
    }
    if (!resolvedTitle && titleLiteral) {
      resolvedTitle = titleLiteral;
    }
    
    // Set Document Title
    if (resolvedTitle) {
      document.title = `${resolvedTitle} | OneSMS`;
    } else {
      document.title = 'ONE SMS | OneSMS - Numéros Virtuels SMS';
    }

    // 2. Resolve Meta Description
    let resolvedDesc = '';
    if (descriptionKey) {
      const translated = t(descriptionKey);
      if (translated && translated !== descriptionKey) {
        resolvedDesc = translated;
      }
    }
    if (!resolvedDesc && descriptionLiteral) {
      resolvedDesc = descriptionLiteral;
    }

    // Update Meta Description
    if (resolvedDesc) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', resolvedDesc);
    }

    // Update Open Graph and Twitter tags
    const updateMeta = (nameOrProperty: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${nameOrProperty}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, nameOrProperty);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    if (resolvedTitle) {
      updateMeta('og:title', resolvedTitle, true);
      updateMeta('twitter:title', resolvedTitle);
    }
    
    if (resolvedDesc) {
      updateMeta('og:description', resolvedDesc, true);
      updateMeta('twitter:description', resolvedDesc);
    }

    if (image) {
      updateMeta('og:image', image, true);
      updateMeta('twitter:image', image);
      updateMeta('twitter:card', 'summary_large_image');
    }

    // Inject JSON-LD structured data
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      script.innerHTML = JSON.stringify(structuredData);
    }

  }, [titleKey, titleLiteral, descriptionKey, descriptionLiteral, image, structuredData, t, i18n.language]);
}
