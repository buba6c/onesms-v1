const fs = require('fs');
const path = require('path');

const files = ['fr', 'en'];

const seoContent = {
    fr: {
        title: 'Pourquoi Choisir One SMS ?',
        p1: 'Dans l\'ère numérique actuelle, la protection de la vie privée et la sécurité des données sont primordiales. One SMS se positionne comme le leader de la solution de numéro de téléphone virtuel pour la vérification SMS en ligne. Notre plateforme vous permet de recevoir des SMS en ligne instantanément, sans révéler votre numéro personnel, garantissant ainsi un anonymat total.',
        p2: 'Que vous ayez besoin d\'activer un compte WhatsApp, Telegram, Facebook, ou tout autre service nécessitant une authentification à deux facteurs (2FA), nos numéros temporaires sont la solution idéale. Contrairement aux services gratuits peu fiables, nous offrons des numéros non-VoIP exclusifs, assurant un taux de délivrabilité maximal et une contournement efficace des restrictions géographiques.',
        p3: 'Notre engagement envers l\'excellence se traduit par une infrastructure cloud de pointe, capable de gérer des milliers de requêtes simultanées. En choisissant One SMS, vous optez pour la fiabilité, la rapidité et la sécurité. Rejoignez notre communauté grandissante et découvrez la liberté d\'accéder à tous les services mondiaux, sans frontières ni limites.'
    },
    en: {
        title: 'Why Choose One SMS?',
        p1: 'In today\'s digital age, privacy protection and data security are paramount. One SMS positions itself as the leading virtual phone number solution for online SMS verification. Our platform allows you to receive SMS online instantly without revealing your personal number, ensuring total anonymity.',
        p2: 'Whether you need to activate a WhatsApp, Telegram, Facebook account, or any other service requiring two-factor authentication (2FA), our temporary numbers are the ideal solution. Unlike unreliable free services, we offer exclusive non-VoIP numbers, ensuring maximum deliverability and effective bypassing of geographic restrictions.',
        p3: 'Our commitment to excellence translates into a state-of-the-art cloud infrastructure capable of handling thousands of simultaneous requests. By choosing One SMS, you verify for reliability, speed, and security. Join our growing community and discover the freedom to access all global services, without borders or limits.'
    }
};

files.forEach(lang => {
    try {
        const filePath = path.join('src', 'locales', `${lang}.json`);
        const content = fs.readFileSync(filePath, 'utf8');
        const json = JSON.parse(content);

        if (!json.about) {
            console.error(`Error: 'about' key missing in ${lang}.json`);
            return;
        }

        // Ensure seo object exists
        json.about.seo = seoContent[lang];

        fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
        console.log(`Successfully updated ${lang}.json`);
    } catch (err) {
        console.error(`Error updating ${lang}.json:`, err);
    }
});
