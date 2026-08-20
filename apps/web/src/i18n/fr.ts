import type { EnDictionary } from './en'

export const fr: EnDictionary = {
  brand: 'DENTORA',
  nav: {
    home: 'Accueil',
    services: 'Services',
    about: 'À propos',
    testimonials: 'Avis',
    contact: 'Contact',
    book: 'Réserver un appel',
  },
  ui: {
    theme: {
      label: 'Th\u00e8me',
      light: 'Mode clair',
      dark: 'Mode sombre',
      system: 'Pr\u00e9f\u00e9rence syst\u00e8me',
    },
    learnMore: 'En savoir plus',
    bookAppointment: 'Prendre rendez-vous',
  },
  hero: {
    badge: 'SOINS DENTAIRES · ALGER',
    lines: ['Des soins', 'confortables et', 'durables.'],
    subline:
      'La santé bucco-dentaire de toute votre famille, avec soin. Technologies modernes, gestes doux et tarifs transparents: toujours.',
    cta: 'Prendre rendez-vous',
    callPrefix: 'Ou appelez :',
    imageAlt: 'Patiente souriant dans un fauteuil dentaire lumineux',
    tags: [
      'Contrôle dentaire',
      'Détartrage',
      'Blanchiment',
      'Traitement des gencives',
      'Implants',
      'Dévitalisation',
    ],
    more: '+{{count}} autres',
  },
  about: {
    label: 'À propos',
    statementA: 'Nous offrons des ',
    statementTeal: 'traitements dentaires personnalisés',
    statementB:
      ' grâce à des technologies modernes et une approche douce, pour des sourires sains et confiants chez chaque patient.',
    statsHint: 'Des milliers de patients nous font confiance !',
    imageAlt: 'Int\u00e9rieur moderne de la clinique dentaire avec un fauteuil dentaire',
    statSatisfaction: 'Taux de satisfaction',
    statSmiles: 'Sourires transformés',
    statRating: 'Note des patients',
    doctor: {
      name: 'Dr. Lebgaa Abderrahmane',
      role: 'Spécialiste dentaire principal',
      rating: '★ 4,9',
      reviews: '(40+ avis)',
    },
  },
  services: {
    label: 'Traitements phares',
    title: 'Des soins dentaires avancés\npour un sourire plus sain',
    list: [
      {
        price: 'DÈS 3 500 DA',
        title: 'Contrôle dentaire',
        body: 'Examen complet de vos dents, gencives et mâchoire. Radiographies numériques et plan de traitement complet inclus.',
        alt: 'Dentiste examinant un patient avec un miroir et une sonde dentaire',
      },
      {
        price: 'DÈS 4 500 DA',
        title: 'Détartrage',
        body: 'Détartrage et polissage professionnels pour éliminer la plaque, le tartre et les taches de surface.',
        alt: 'Instruments dentaires sur une surface claire',
      },
      {
        price: 'DÈS 25 000 DA',
        title: 'Blanchiment',
        body: 'Blanchiment professionnel au cabinet ou à domicile pour éclaircir votre sourire jusqu\u2019à 8 teintes.',
        alt: 'Sourire éclatant après un blanchiment professionnel',
      },
      {
        price: 'DÈS 90 000 DA',
        title: 'Implants dentaires',
        body: 'Des remplacements permanents et esthétiques pour vos dents manquantes: posés chirurgicalement et conçus pour durer.',
        alt: 'Maquette d\u2019implant dentaire avec couronne',
      },
      {
        price: 'DÈS 40 000 DA',
        title: 'Facettes & couronnes',
        body: 'Coquilles et couronnes en porcelaine sur mesure pour restaurer la forme, la couleur et la solidité de vos dents.',
        alt: 'Restauration dentaire en céramique sur une dent de devant',
      },
      {
        price: 'URGENCE',
        title: 'Urgences dentaires',
        body: 'Rendez-vous le jour même pour les maux de dents, dents cassées, plombages perdus et douleurs. Appelez à tout moment.',
        alt: 'Dentiste prodiguant des soins d\u2019urgence',
      },
    ],
  },
  why: {
    label: 'Pourquoi nous choisir',
    title: 'Vous cherchez un dentiste pour un sourire remarquable ?',
    body: 'La clinique Dentora offre des soins dentaires de la plus haute qualité à Alger, avec une équipe de dentistes et de spécialistes expérimentés.',
    items: [
      'Contrôles dentaires',
      'Soins d\u2019hygiène',
      'Couronnes, facettes & bridges',
      'Traitement de canal',
      'Implants dentaires',
      'Blanchiment professionnel',
    ],
    imageAlt: 'L\u2019\u00e9quipe de Dentora r\u00e9unie dans ses tenues de travail',
  },
  process: {
    label: 'Comment ça marche',
    title: 'Votre parcours vers un sourire plus sain.',
    list: [
      {
        title: 'Réserver en ligne',
        body: "Remplissez notre formulaire rapide ou appelez-nous: nous confirmons votre rendez-vous dans l'heure.",
        alt: 'Réservation d\u2019un rendez-vous sur un ordinateur portable à la maison',
      },
      {
        title: 'Visite d\u2019accueil',
        body: 'Arrivez à l\u2019heure convenue, rencontrez votre dentiste et nous passerons en revue votre historique dentaire.',
        alt: 'Accueil chaleureux à la réception de la clinique',
      },
      {
        title: 'Évaluation du sourire',
        body: 'Radiographies numériques, examen complet et plan de soins transparent avec tarifs avant de commencer.',
        alt: 'Dentiste expliquant les résultats sur un écran',
      },
      {
        title: 'Traitement & suivi',
        body: 'Soins réalisés, résultats vérifiés, conseils d\u2019après-soin expliqués. Nous suivons votre satisfaction.',
        alt: 'Patient satisfait quittant la clinique avec le sourire',
      },
    ],
  },
  testimonials: {
    label: 'Avis des patients',
    title: 'Ne nous croyez pas sur parole.',
    subline: '★★★★★ 4,9/5 de moyenne sur plus de 1 200 avis vérifiés',
    list: [
      {
        quote:
          'Je vais chez Dentura depuis deux ans et je ne changerai pour rien au monde. Chaque étape de mon traitement a été expliquée clairement, sans aucune pression. La meilleure expérience dentaire de ma vie.',
        name: 'Amina B.',
        source: 'Avis Google vérifié',
      },
      {
        quote:
          'Redoutant le dentiste par le passé, l\u2019équipe de Dentura a totalement changé mon expérience. Rapide, indolore, et des résultats incroyables. Mon sourire n\u2019a jamais été aussi beau.',
        name: 'Mohamed T.',
        source: 'Avis Google vérifié',
      },
      {
        quote:
          'Toute ma famille vient ici après une recommandation. L\u2019équipe est patiente et douce avec mes enfants, c\u2019est essentiel pour moi. Patients Dentura pour la vie.',
        name: 'Imen K.',
        source: 'Avis Google vérifié',
      },
    ],
  },
  photoCta: {
    title: 'Prêt à arborer votre plus beau sourire ?',
    body: 'Rendez-vous le jour même disponibles. Pas de liste d\u2019attente.',
    cta: 'Prendre rendez-vous',
    imageAlt: 'Patiente heureuse avec un sourire éclatant',
  },
  faq: {
    label: 'FAQ',
    title: 'Les questions fréquentes, des réponses claires.',
    list: [
      {
        q: 'Acceptez-vous de nouveaux patients ?',
        a: "Oui: nous accueillons toujours de nouveaux patients et leurs familles. Vous pouvez réserver en ligne, nous appeler ou simplement passer pendant les heures d'ouverture. Des rendez-vous le jour même sont souvent disponibles.",
      },
      {
        q: 'Les soins dentaires sont-ils douloureux ?',
        a: 'Votre confort est notre priorité à chaque étape. Tous les soins sont réalisés sous anesthésie locale, sans douleur. Nous proposons aussi des options de sédation pour les patients anxieux.',
      },
      {
        q: 'À quelle fréquence dois-je faire un contrôle ?',
        a: 'Nous recommandons un contrôle et un détartrage professionnel tous les 6 mois. Certains patients peuvent bénéficier de visites plus fréquentes: votre dentiste vous conseillera selon vos besoins.',
      },
      {
        q: 'Proposez-vous des facilités de paiement ?',
        a: 'Oui. Nous offrons des plans de paiement mensuels flexibles via nos partenaires financiers. Renseignez-vous auprès de notre équipe sur les options à 0 % pour les traitements à partir de 40 000 DA.',
      },
      {
        q: 'Que faire en cas d\u2019urgence dentaire ?',
        a: "Appelez immédiatement notre ligne d'urgence: +213 555 00 00 00. Nous proposons des créneaux le jour même pour les maux de dents, dents cassées, couronnes perdues et traumatismes. N\u2019attendez pas si vous avez mal.",
      },
      {
        q: 'Les enfants peuvent-ils être patients chez Dentor ?',
        a: 'Absolument. Nous traitons les patients de tous les âges. Notre équipe sait mettre les jeunes patients en confiance dès leur première dent.',
      },
      {
        q: 'Combien de temps durent les traitements ?',
        a: 'Cela dépend du traitement. Un contrôle standard dure 45–60 min. Un détartrage 45 min. Les interventions plus complexes, comme les implants ou les couronnes, nécessitent plusieurs visites: le dentiste vous donnera un calendrier complet lors de la consultation.',
      },
    ],
  },
  cta: {
    title: 'Votre sourire le plus sain commence aujourd\u2019hui.',
    body: 'Demandez une consultation gratuite en moins de 2 minutes. Rendez-vous possible le jour même. Tarifs transparents, sans surprise.',
    cta: 'Consultation gratuite',
    trust: ['Sans liste d\u2019attente', 'Tarifs transparents', 'Tous les âges bienvenus'],
  },
  footer: {
    tagline: 'La clinique dentaire de votre famille',
    servicesLabel: 'Services',
    clinicLabel: 'Clinique',
    hoursLabel: "Horaires d'ouverture",
    servicesLinks: [
      'Contrôle dentaire',
      'Détartrage',
      'Blanchiment',
      'Implants',
      'Facettes',
      'Urgences',
    ],
    clinicLinks: [
      'À propos',
      'Rencontrer l\u2019équipe',
      'Avis des patients',
      'Blogue',
      'Carrières',
    ],
    hours: ['Dim – Jeu : 8h30 – 18h30', 'Samedi : 9h00 – 13h00', 'Vendredi : Fermé'],
    emergency: 'Urgences 24/7 :',
    copyright: '© {{year}} Dentora Clinique Dentaire. Tous droits réservés.',
    privacy: 'Politique de confidentialité',
    terms: 'Conditions d\u2019utilisation',
  },
  booking: {
    title: 'Prendre un rendez-vous',
    subtitle: 'Nous confirmons votre rendez-vous dans l\u2019heure.',
    name: 'Nom complet',
    phone: 'Numéro de téléphone',
    service: 'Service',
    date: 'Date souhaitée',
    message: 'Message (facultatif)',
    submit: 'Confirmer la réservation',
    submitting: 'Envoi…',
    error: 'Une erreur s\u2019est produite. Veuillez réessayer.',
    already: 'Nous vous avons déjà contacté !',
    alreadyNote: 'Une demande est déjà en cours pour ce numéro. Notre équipe vous rappellera.',
    queued: 'Nous nous occupons de votre demande !',
    queuedNote:
      'Votre appareil est hors ligne. Votre demande a été enregistrée et sera envoyée automatiquement dès le retour de la connexion.',
    success: 'Merci ! Votre demande a été reçue.',
    successNote: 'Notre équipe vous appellera prochainement pour confirmer.',
    whatsapp: 'Envoyer via WhatsApp',
    close: 'Fermer',
  },
  legal: {
    back: 'Retour à l\u2019accueil',
    updatedOn: 'Dernière mise à jour : ',
    privacy: {
      title: 'Politique de confidentialité',
      intro:
        'Cette politique explique quelles informations le site DENTORA collecte, comment elles sont utilisées et quels sont vos choix. En utilisant ce site, vous acceptez les pratiques décrites ci-dessous.',
      sections: [
        {
          heading: '1. Informations que nous collectons',
          body: 'Lorsque vous utilisez notre site, nous pouvons collecter les informations que vous fournissez via le formulaire de rendez-vous (nom, numéro de téléphone, service souhaité et date préférée), ainsi que des données techniques basiques telles que le type de navigateur et les pages consultées.',
        },
        {
          heading: '2. Utilisation de vos informations',
          body: 'Nous utilisons vos coordonnées uniquement pour recevoir, confirmer et gérer vos demandes de rendez-vous, par exemple en vous contactant par téléphone ou via WhatsApp. Nous ne vendons jamais vos données personnelles à des tiers.',
        },
        {
          heading: '3. Données de santé',
          body: 'Nous ne collectons aucun dossier médical ni information de santé via ce site. Vos données de santé ne sont échangées qu\u2019au cours d\u2019une consultation en clinique, dans le respect du secret professionnel.',
        },
        {
          heading: '4. Cookies et services tiers',
          body: 'Ce site utilise un stockage local minimal (vos préférences de thème et de langue) et charge des polices et images auprès de fournisseurs tiers (Google Fonts, Unsplash). Ces fournisseurs peuvent traiter des données techniques selon leurs propres politiques de confidentialité.',
        },
        {
          heading: '5. Sécurité des données',
          body: 'Nous prenons des mesures techniques et organisationnelles raisonnables pour protéger vos informations contre tout accès non autorisé, toute perte ou tout usage abusif.',
        },
        {
          heading: '6. Vos droits',
          body: 'Vous pouvez à tout moment demander l\u2019accès, la rectification ou la suppression de vos informations personnelles en nous contactant via les coordonnées ci-dessous.',
        },
        {
          heading: '7. Contact',
          body: 'Pour toute question relative à votre vie privée, contactez-nous au +213 21 55 88 00 ou par e-mail à hello@dentora.dz.',
        },
      ],
    },
    terms: {
      title: 'Conditions d\u2019utilisation',
      updated: 'En accédant au site DENTORA, vous acceptez les conditions suivantes.',
      sections: [
        {
          heading: '1. Acceptation des conditions',
          body: 'En utilisant ce site, vous acceptez d\u2019être lié par les présentes conditions. Si vous n\u2019êtes pas d\u2019accord, veuillez ne pas utiliser notre site.',
        },
        {
          heading: '2. Utilisation du site',
          body: 'Vous vous engagez à utiliser ce site uniquement à des fins légales et à ne pas en abuser du contenu, ni tenter de nuire à sa disponibilité ou à sa sécurité.',
        },
        {
          heading: '3. Rendez-vous et réservations',
          body: 'Envoyer une demande de rendez-vous est une expression d\u2019intérêt et ne garantit pas de rendez-vous. Chaque rendez-vous est confirmé par téléphone ou WhatsApp avant d\u2019être finalisé.',
        },
        {
          heading: '4. Absence d\u2019avis médical',
          body: 'Le contenu de ce site est fourni à titre informatif uniquement et ne constitue pas un avis médical. Seul un examen clinique permet d\u2019établir un diagnostic et un plan de traitement personnalisé.',
        },
        {
          heading: '5. Propriété intellectuelle',
          body: 'Tout le contenu de ce site (textes, images, logo et design) appartient à DENTORA ou à ses fournisseurs et ne peut être reproduit sans autorisation écrite préalable.',
        },
        {
          heading: '6. Limitation de responsabilité',
          body: 'Nous faisons de notre mieux pour que le site soit exact et opérationnel, mais nous ne pouvons être tenus responsables d\u2019une indisponibilité temporaire ou de décisions prises sur la base des informations publiées.',
        },
        {
          heading: '7. Modifications des conditions',
          body: 'Nous pouvons modifier ces conditions à tout moment. La version la plus récente sera toujours publiée sur cette page.',
        },
        {
          heading: '8. Contact',
          body: 'Pour toute question juridique, contactez-nous à hello@dentora.dz.',
        },
      ],
    },
  },
  offline: {
    offline: 'Vous êtes hors ligne — le site continue de fonctionner.',
    queued: 'Demande hors ligne enregistrée. Elle sera envoyée automatiquement à la reconnexion.',
  },
}
