export type LandingLanguage = 'es' | 'en' | 'pt' | 'zh' | 'fr' | 'it';

export type LandingTranslation = {
  languageLabel: string;
  nav: {
    home: string;
    about: string;
    services: string;
    story: string;
    values: string;
    contact: string;
    login: string;
  };
  hero: {
    badge: string;
    title: string;
    highlight: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
    panelTitle: string;
    panelSubtitle: string;
    panelItems: string[];
  };
  stats: {
    label: string;
    value: string;
    detail: string;
  }[];
  about: {
    eyebrow: string;
    title: string;
    description: string;
    cards: {
      title: string;
      text: string;
    }[];
  };
  services: {
    eyebrow: string;
    title: string;
    description: string;
    items: {
      title: string;
      text: string;
    }[];
  };
  story: {
    eyebrow: string;
    title: string;
    description: string;
  };
  mission: {
    missionTitle: string;
    missionText: string;
    visionTitle: string;
    visionText: string;
    purposeTitle: string;
    purposeText: string;
  };
  values: {
    eyebrow: string;
    title: string;
    items: string[];
  };
  contact: {
    eyebrow: string;
    title: string;
    description: string;
    name: string;
    email: string;
    company: string;
    message: string;
    button: string;
    locationTitle: string;
    locationText: string;
    schedule: string;
  };
  footer: {
    description: string;
    rights: string;
  };
};

export const landingLanguages: {
  code: LandingLanguage;
  label: string;
  short: string;
}[] = [
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'pt', label: 'Português', short: 'PT' },
  { code: 'zh', label: '中文', short: 'ZH' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'it', label: 'Italiano', short: 'IT' },
];

export const landingTranslations: Record<LandingLanguage, LandingTranslation> = {
  es: {
    languageLabel: 'Idioma',
    nav: {
      home: 'Inicio',
      about: 'Quiénes somos',
      services: 'Qué hacemos',
      story: 'Historia',
      values: 'Valores',
      contact: 'Contacto',
      login: 'Iniciar sesión',
    },
    hero: {
      badge: 'Suite empresarial de Recursos Humanos',
      title: 'Humaniza tu gestión de',
      highlight: 'Recursos Humanos',
      description:
        'SMART RH centraliza empleados, asistencia, contratos, nómina, vacaciones, soporte, documentación y análisis de datos en una plataforma moderna, segura y funcional.',
      primaryAction: 'Conocer el sistema',
      secondaryAction: 'Entrar al portal',
      panelTitle: 'Panel administrativo',
      panelSubtitle: 'Operación digital centralizada',
      panelItems: [
        'Control de asistencia con QR',
        'Contratos y credenciales digitales',
        'Soporte interno y trazabilidad',
        'Reportes ETL para toma de decisiones',
      ],
    },
    stats: [
      { label: 'Gestión', value: '360°', detail: 'Procesos de RRHH centralizados' },
      { label: 'Modelo', value: 'Híbrido', detail: 'MySQL + MongoDB' },
      { label: 'Acceso', value: 'Web + App', detail: 'Portal administrativo y móvil' },
      { label: 'Alcance', value: '6 idiomas', detail: 'Experiencia internacional' },
    ],
    about: {
      eyebrow: 'Quiénes somos',
      title: 'Tecnología creada para equipos humanos',
      description:
        'SMART RH es una solución digital diseñada para modernizar la administración de Recursos Humanos, reducir procesos manuales y mejorar la experiencia de colaboradores y administradores.',
      cards: [
        {
          title: 'Enfoque empresarial',
          text: 'Diseñamos una plataforma clara, escalable y preparada para la operación real de una organización.',
        },
        {
          title: 'Experiencia humana',
          text: 'No solo controlamos procesos: buscamos que cada empleado tenga información accesible y confiable.',
        },
        {
          title: 'Trazabilidad',
          text: 'Cada módulo permite dar seguimiento a actividades, documentos, soporte y decisiones administrativas.',
        },
      ],
    },
    services: {
      eyebrow: 'Qué hacemos',
      title: 'Centralizamos la operación de Recursos Humanos',
      description:
        'SMART RH integra los módulos clave para administrar personal, documentación laboral, incidencias y análisis ejecutivo.',
      items: [
        { title: 'Usuarios', text: 'Alta, consulta y administración de empleados.' },
        { title: 'Asistencia', text: 'Registro de entrada y salida mediante QR.' },
        { title: 'Contratos', text: 'Gestión contractual y generación documental.' },
        { title: 'Nómina', text: 'Consulta y control de registros de pago.' },
        { title: 'Vacaciones', text: 'Solicitudes, aprobación y control de días.' },
        { title: 'Documentación', text: 'Credencial, contrato PDF y expediente digital.' },
        { title: 'Soporte', text: 'Tickets internos y seguimiento administrativo.' },
        { title: 'ETL', text: 'Reportes, análisis y visualización de datos.' },
      ],
    },
    story: {
      eyebrow: 'Humaniza tu marca',
      title: 'Una historia construida alrededor de las personas',
      description:
        'SMART RH nace de la necesidad de acercar la tecnología a los equipos humanos. Su propósito es facilitar el trabajo administrativo, dar transparencia a los colaboradores y permitir que Recursos Humanos tome mejores decisiones con información confiable.',
    },
    mission: {
      missionTitle: 'Misión',
      missionText:
        'Digitalizar y optimizar la gestión de Recursos Humanos mediante una plataforma accesible, segura y eficiente.',
      visionTitle: 'Visión',
      visionText:
        'Ser una solución integral que conecte empresas y colaboradores con tecnología confiable, moderna y humana.',
      purposeTitle: 'Propósito',
      purposeText:
        'Reducir la carga administrativa y mejorar la experiencia laboral mediante procesos claros y automatizados.',
    },
    values: {
      eyebrow: 'Valores',
      title: 'Principios que guían nuestra plataforma',
      items: ['Innovación', 'Transparencia', 'Seguridad', 'Responsabilidad', 'Eficiencia', 'Enfoque humano'],
    },
    contact: {
      eyebrow: 'Contacto',
      title: 'Hablemos sobre la transformación de tu RRHH',
      description:
        'Completa el formulario o visita nuestra ubicación para conocer cómo SMART RH puede fortalecer la gestión interna de tu organización.',
      name: 'Nombre completo',
      email: 'Correo electrónico',
      company: 'Empresa',
      message: 'Mensaje',
      button: 'Enviar mensaje',
      locationTitle: 'Oficina principal',
      locationText: 'Ciudad de México, México',
      schedule: 'Lunes a viernes · 9:00 a.m. - 6:00 p.m.',
    },
    footer: {
      description: 'Suite empresarial para la gestión moderna de Recursos Humanos.',
      rights: 'Todos los derechos reservados.',
    },
  },

  en: {
    languageLabel: 'Language',
    nav: {
      home: 'Home',
      about: 'About us',
      services: 'What we do',
      story: 'Story',
      values: 'Values',
      contact: 'Contact',
      login: 'Sign in',
    },
    hero: {
      badge: 'Enterprise Human Resources Suite',
      title: 'Humanize your',
      highlight: 'HR management',
      description:
        'SMART RH centralizes employees, attendance, contracts, payroll, vacations, support, documentation and data analytics in a modern, secure and functional platform.',
      primaryAction: 'Explore the system',
      secondaryAction: 'Go to portal',
      panelTitle: 'Admin dashboard',
      panelSubtitle: 'Centralized digital operation',
      panelItems: [
        'QR attendance control',
        'Digital contracts and credentials',
        'Internal support and traceability',
        'ETL reports for decision-making',
      ],
    },
    stats: [
      { label: 'Management', value: '360°', detail: 'Centralized HR processes' },
      { label: 'Model', value: 'Hybrid', detail: 'MySQL + MongoDB' },
      { label: 'Access', value: 'Web + App', detail: 'Admin portal and mobile app' },
      { label: 'Reach', value: '6 languages', detail: 'International experience' },
    ],
    about: {
      eyebrow: 'About us',
      title: 'Technology designed for human teams',
      description:
        'SMART RH is a digital solution built to modernize Human Resources administration, reduce manual tasks and improve the experience of employees and administrators.',
      cards: [
        { title: 'Enterprise focus', text: 'A clear, scalable platform ready for real organizational operation.' },
        { title: 'Human experience', text: 'We do not only control processes; we make information accessible and reliable.' },
        { title: 'Traceability', text: 'Each module helps track activities, documents, support and administrative decisions.' },
      ],
    },
    services: {
      eyebrow: 'What we do',
      title: 'We centralize Human Resources operations',
      description:
        'SMART RH integrates key modules to manage staff, labor documentation, internal requests and executive analytics.',
      items: [
        { title: 'Users', text: 'Employee registration, consultation and administration.' },
        { title: 'Attendance', text: 'Clock-in and clock-out records using QR.' },
        { title: 'Contracts', text: 'Contract management and document generation.' },
        { title: 'Payroll', text: 'Payment records and payroll control.' },
        { title: 'Vacations', text: 'Requests, approval and balance control.' },
        { title: 'Documentation', text: 'Credential, PDF contract and digital file.' },
        { title: 'Support', text: 'Internal tickets and administrative follow-up.' },
        { title: 'ETL', text: 'Reports, analysis and data visualization.' },
      ],
    },
    story: {
      eyebrow: 'Humanize your brand',
      title: 'A story built around people',
      description:
        'SMART RH was created to bring technology closer to human teams. Its purpose is to simplify administrative work, provide transparency to employees and help HR teams make better decisions with reliable information.',
    },
    mission: {
      missionTitle: 'Mission',
      missionText: 'Digitize and optimize HR management through an accessible, secure and efficient platform.',
      visionTitle: 'Vision',
      visionText: 'Become an integral solution that connects companies and employees through reliable, modern and human technology.',
      purposeTitle: 'Purpose',
      purposeText: 'Reduce administrative workload and improve the work experience through clear and automated processes.',
    },
    values: {
      eyebrow: 'Values',
      title: 'Principles that guide our platform',
      items: ['Innovation', 'Transparency', 'Security', 'Responsibility', 'Efficiency', 'Human focus'],
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Let’s talk about transforming your HR',
      description:
        'Complete the form or visit our location to learn how SMART RH can strengthen your internal management.',
      name: 'Full name',
      email: 'Email address',
      company: 'Company',
      message: 'Message',
      button: 'Send message',
      locationTitle: 'Main office',
      locationText: 'Mexico City, Mexico',
      schedule: 'Monday to Friday · 9:00 a.m. - 6:00 p.m.',
    },
    footer: {
      description: 'Enterprise suite for modern Human Resources management.',
      rights: 'All rights reserved.',
    },
  },

  pt: {
    languageLabel: 'Idioma',
    nav: {
      home: 'Início',
      about: 'Quem somos',
      services: 'O que fazemos',
      story: 'História',
      values: 'Valores',
      contact: 'Contato',
      login: 'Entrar',
    },
    hero: {
      badge: 'Suíte empresarial de Recursos Humanos',
      title: 'Humanize sua gestão de',
      highlight: 'Recursos Humanos',
      description:
        'SMART RH centraliza colaboradores, presença, contratos, folha de pagamento, férias, suporte, documentação e análise de dados em uma plataforma moderna, segura e funcional.',
      primaryAction: 'Conhecer o sistema',
      secondaryAction: 'Entrar no portal',
      panelTitle: 'Painel administrativo',
      panelSubtitle: 'Operação digital centralizada',
      panelItems: [
        'Controle de presença por QR',
        'Contratos e credenciais digitais',
        'Suporte interno e rastreabilidade',
        'Relatórios ETL para decisões',
      ],
    },
    stats: [
      { label: 'Gestão', value: '360°', detail: 'Processos de RH centralizados' },
      { label: 'Modelo', value: 'Híbrido', detail: 'MySQL + MongoDB' },
      { label: 'Acesso', value: 'Web + App', detail: 'Portal administrativo e app móvel' },
      { label: 'Alcance', value: '6 idiomas', detail: 'Experiência internacional' },
    ],
    about: {
      eyebrow: 'Quem somos',
      title: 'Tecnologia criada para equipes humanas',
      description:
        'SMART RH é uma solução digital criada para modernizar a administração de Recursos Humanos, reduzir processos manuais e melhorar a experiência de colaboradores e administradores.',
      cards: [
        { title: 'Foco empresarial', text: 'Uma plataforma clara, escalável e preparada para a operação real.' },
        { title: 'Experiência humana', text: 'Não controlamos apenas processos; tornamos a informação acessível e confiável.' },
        { title: 'Rastreabilidade', text: 'Cada módulo permite acompanhar atividades, documentos, suporte e decisões.' },
      ],
    },
    services: {
      eyebrow: 'O que fazemos',
      title: 'Centralizamos a operação de Recursos Humanos',
      description:
        'SMART RH integra módulos essenciais para gerenciar pessoas, documentos, solicitações internas e análises executivas.',
      items: [
        { title: 'Usuários', text: 'Cadastro, consulta e administração de colaboradores.' },
        { title: 'Presença', text: 'Entrada e saída com registro por QR.' },
        { title: 'Contratos', text: 'Gestão contratual e geração de documentos.' },
        { title: 'Folha', text: 'Registros de pagamento e controle salarial.' },
        { title: 'Férias', text: 'Solicitações, aprovação e saldo disponível.' },
        { title: 'Documentação', text: 'Credencial, contrato PDF e arquivo digital.' },
        { title: 'Suporte', text: 'Tickets internos e acompanhamento administrativo.' },
        { title: 'ETL', text: 'Relatórios, análise e visualização de dados.' },
      ],
    },
    story: {
      eyebrow: 'Humanize sua marca',
      title: 'Uma história construída ao redor das pessoas',
      description:
        'SMART RH nasce da necessidade de aproximar a tecnologia das equipes humanas. Seu propósito é simplificar o trabalho administrativo, dar transparência aos colaboradores e apoiar melhores decisões de RH.',
    },
    mission: {
      missionTitle: 'Missão',
      missionText: 'Digitalizar e otimizar a gestão de RH com uma plataforma acessível, segura e eficiente.',
      visionTitle: 'Visão',
      visionText: 'Ser uma solução integral que conecta empresas e colaboradores com tecnologia confiável e humana.',
      purposeTitle: 'Propósito',
      purposeText: 'Reduzir a carga administrativa e melhorar a experiência laboral com processos claros e automatizados.',
    },
    values: {
      eyebrow: 'Valores',
      title: 'Princípios que guiam nossa plataforma',
      items: ['Inovação', 'Transparência', 'Segurança', 'Responsabilidade', 'Eficiência', 'Foco humano'],
    },
    contact: {
      eyebrow: 'Contato',
      title: 'Vamos falar sobre transformar seu RH',
      description:
        'Preencha o formulário ou visite nossa localização para conhecer como SMART RH pode fortalecer sua gestão interna.',
      name: 'Nome completo',
      email: 'E-mail',
      company: 'Empresa',
      message: 'Mensagem',
      button: 'Enviar mensagem',
      locationTitle: 'Escritório principal',
      locationText: 'Cidade do México, México',
      schedule: 'Segunda a sexta · 9:00 - 18:00',
    },
    footer: {
      description: 'Suíte empresarial para a gestão moderna de Recursos Humanos.',
      rights: 'Todos os direitos reservados.',
    },
  },

  zh: {
    languageLabel: '语言',
    nav: {
      home: '首页',
      about: '关于我们',
      services: '服务',
      story: '品牌故事',
      values: '价值观',
      contact: '联系',
      login: '登录',
    },
    hero: {
      badge: '企业级人力资源管理套件',
      title: '让你的',
      highlight: '人力资源管理更具温度',
      description:
        'SMART RH 将员工、考勤、合同、薪资、假期、支持、文档和数据分析集中在一个现代、安全且高效的平台中。',
      primaryAction: '了解系统',
      secondaryAction: '进入门户',
      panelTitle: '管理控制台',
      panelSubtitle: '集中化数字运营',
      panelItems: ['二维码考勤管理', '数字合同与员工凭证', '内部支持与可追踪流程', '用于决策的 ETL 报告'],
    },
    stats: [
      { label: '管理', value: '360°', detail: '集中化人力资源流程' },
      { label: '模型', value: '混合', detail: 'MySQL + MongoDB' },
      { label: '访问', value: 'Web + App', detail: '管理门户与移动应用' },
      { label: '范围', value: '6 种语言', detail: '国际化体验' },
    ],
    about: {
      eyebrow: '关于我们',
      title: '为人本团队打造的技术',
      description:
        'SMART RH 是一套数字化解决方案，用于现代化人力资源管理，减少手工流程，并改善员工与管理员的使用体验。',
      cards: [
        { title: '企业化视角', text: '清晰、可扩展，并适用于真实组织运营的平台。' },
        { title: '人性化体验', text: '我们不仅管理流程，也让员工获得可靠且易访问的信息。' },
        { title: '可追踪性', text: '每个模块都支持跟踪活动、文档、支持请求和管理决策。' },
      ],
    },
    services: {
      eyebrow: '服务',
      title: '集中管理人力资源运营',
      description: 'SMART RH 集成关键模块，用于管理员工、劳动文档、内部请求和执行分析。',
      items: [
        { title: '用户', text: '员工登记、查询与管理。' },
        { title: '考勤', text: '通过二维码记录上下班。' },
        { title: '合同', text: '合同管理与文档生成。' },
        { title: '薪资', text: '薪资记录与支付管理。' },
        { title: '假期', text: '申请、审批与余额控制。' },
        { title: '文档', text: '员工凭证、PDF 合同与数字档案。' },
        { title: '支持', text: '内部工单与管理跟进。' },
        { title: 'ETL', text: '报告、分析与数据可视化。' },
      ],
    },
    story: {
      eyebrow: '让品牌更具温度',
      title: '围绕人构建的故事',
      description:
        'SMART RH 的诞生源于将技术带给人力团队的需求。它旨在简化行政工作，提高员工透明度，并帮助人力资源团队基于可靠信息做出更好的决策。',
    },
    mission: {
      missionTitle: '使命',
      missionText: '通过安全、高效且易用的平台，实现人力资源管理数字化和优化。',
      visionTitle: '愿景',
      visionText: '成为连接企业与员工的综合解决方案，提供可靠、现代且人性化的技术。',
      purposeTitle: '目标',
      purposeText: '减少行政负担，通过清晰和自动化流程改善工作体验。',
    },
    values: {
      eyebrow: '价值观',
      title: '指导平台发展的原则',
      items: ['创新', '透明', '安全', '责任', '效率', '以人为本'],
    },
    contact: {
      eyebrow: '联系',
      title: '让我们谈谈如何转型你的人力资源管理',
      description: '填写表单或访问我们的位置，了解 SMART RH 如何加强组织内部管理。',
      name: '姓名',
      email: '电子邮件',
      company: '公司',
      message: '留言',
      button: '发送消息',
      locationTitle: '总部办公室',
      locationText: '墨西哥城，墨西哥',
      schedule: '周一至周五 · 上午 9:00 - 下午 6:00',
    },
    footer: {
      description: '用于现代人力资源管理的企业级套件。',
      rights: '版权所有。',
    },
  },

  fr: {
    languageLabel: 'Langue',
    nav: {
      home: 'Accueil',
      about: 'Qui sommes-nous',
      services: 'Services',
      story: 'Histoire',
      values: 'Valeurs',
      contact: 'Contact',
      login: 'Connexion',
    },
    hero: {
      badge: 'Suite RH d’entreprise',
      title: 'Humanisez votre gestion des',
      highlight: 'Ressources Humaines',
      description:
        'SMART RH centralise les employés, la présence, les contrats, la paie, les congés, le support, la documentation et l’analyse de données dans une plateforme moderne, sûre et fonctionnelle.',
      primaryAction: 'Découvrir le système',
      secondaryAction: 'Accéder au portail',
      panelTitle: 'Tableau de bord',
      panelSubtitle: 'Opération numérique centralisée',
      panelItems: [
        'Contrôle de présence par QR',
        'Contrats et badges numériques',
        'Support interne et traçabilité',
        'Rapports ETL pour la décision',
      ],
    },
    stats: [
      { label: 'Gestion', value: '360°', detail: 'Processus RH centralisés' },
      { label: 'Modèle', value: 'Hybride', detail: 'MySQL + MongoDB' },
      { label: 'Accès', value: 'Web + App', detail: 'Portail admin et application mobile' },
      { label: 'Portée', value: '6 langues', detail: 'Expérience internationale' },
    ],
    about: {
      eyebrow: 'Qui sommes-nous',
      title: 'Une technologie créée pour les équipes humaines',
      description:
        'SMART RH est une solution numérique conçue pour moderniser l’administration RH, réduire les tâches manuelles et améliorer l’expérience des employés et administrateurs.',
      cards: [
        { title: 'Vision entreprise', text: 'Une plateforme claire, évolutive et prête pour une opération réelle.' },
        { title: 'Expérience humaine', text: 'Nous ne contrôlons pas seulement les processus; nous rendons l’information fiable et accessible.' },
        { title: 'Traçabilité', text: 'Chaque module permet de suivre activités, documents, support et décisions administratives.' },
      ],
    },
    services: {
      eyebrow: 'Services',
      title: 'Nous centralisons les opérations RH',
      description: 'SMART RH intègre les modules clés pour gérer le personnel, les documents, les demandes internes et l’analyse.',
      items: [
        { title: 'Utilisateurs', text: 'Inscription, consultation et administration des employés.' },
        { title: 'Présence', text: 'Entrées et sorties enregistrées avec QR.' },
        { title: 'Contrats', text: 'Gestion contractuelle et génération de documents.' },
        { title: 'Paie', text: 'Registres de paiement et contrôle de paie.' },
        { title: 'Congés', text: 'Demandes, approbations et soldes.' },
        { title: 'Documentation', text: 'Badge, contrat PDF et dossier numérique.' },
        { title: 'Support', text: 'Tickets internes et suivi administratif.' },
        { title: 'ETL', text: 'Rapports, analyse et visualisation des données.' },
      ],
    },
    story: {
      eyebrow: 'Humanisez votre marque',
      title: 'Une histoire construite autour des personnes',
      description:
        'SMART RH est né du besoin de rapprocher la technologie des équipes humaines. Son objectif est de simplifier le travail administratif, d’apporter de la transparence et d’aider les RH à mieux décider.',
    },
    mission: {
      missionTitle: 'Mission',
      missionText: 'Numériser et optimiser la gestion RH grâce à une plateforme accessible, sûre et efficace.',
      visionTitle: 'Vision',
      visionText: 'Être une solution intégrale reliant entreprises et collaborateurs grâce à une technologie fiable et humaine.',
      purposeTitle: 'Objectif',
      purposeText: 'Réduire la charge administrative et améliorer l’expérience de travail par des processus clairs et automatisés.',
    },
    values: {
      eyebrow: 'Valeurs',
      title: 'Les principes qui guident notre plateforme',
      items: ['Innovation', 'Transparence', 'Sécurité', 'Responsabilité', 'Efficacité', 'Approche humaine'],
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Parlons de la transformation de vos RH',
      description: 'Remplissez le formulaire ou visitez notre emplacement pour découvrir comment SMART RH peut renforcer votre gestion interne.',
      name: 'Nom complet',
      email: 'Adresse e-mail',
      company: 'Entreprise',
      message: 'Message',
      button: 'Envoyer',
      locationTitle: 'Bureau principal',
      locationText: 'Mexico, Mexique',
      schedule: 'Lundi à vendredi · 9h00 - 18h00',
    },
    footer: {
      description: 'Suite d’entreprise pour la gestion moderne des Ressources Humaines.',
      rights: 'Tous droits réservés.',
    },
  },

  it: {
    languageLabel: 'Lingua',
    nav: {
      home: 'Inizio',
      about: 'Chi siamo',
      services: 'Cosa facciamo',
      story: 'Storia',
      values: 'Valori',
      contact: 'Contatto',
      login: 'Accedi',
    },
    hero: {
      badge: 'Suite aziendale per Risorse Umane',
      title: 'Umanizza la gestione delle',
      highlight: 'Risorse Umane',
      description:
        'SMART RH centralizza dipendenti, presenze, contratti, paghe, ferie, supporto, documentazione e analisi dei dati in una piattaforma moderna, sicura e funzionale.',
      primaryAction: 'Scopri il sistema',
      secondaryAction: 'Vai al portale',
      panelTitle: 'Pannello amministrativo',
      panelSubtitle: 'Operazione digitale centralizzata',
      panelItems: [
        'Controllo presenze con QR',
        'Contratti e credenziali digitali',
        'Supporto interno e tracciabilità',
        'Report ETL per decisioni',
      ],
    },
    stats: [
      { label: 'Gestione', value: '360°', detail: 'Processi HR centralizzati' },
      { label: 'Modello', value: 'Ibrido', detail: 'MySQL + MongoDB' },
      { label: 'Accesso', value: 'Web + App', detail: 'Portale admin e app mobile' },
      { label: 'Portata', value: '6 lingue', detail: 'Esperienza internazionale' },
    ],
    about: {
      eyebrow: 'Chi siamo',
      title: 'Tecnologia creata per team umani',
      description:
        'SMART RH è una soluzione digitale progettata per modernizzare l’amministrazione HR, ridurre processi manuali e migliorare l’esperienza di dipendenti e amministratori.',
      cards: [
        { title: 'Focus aziendale', text: 'Una piattaforma chiara, scalabile e pronta per l’operazione reale.' },
        { title: 'Esperienza umana', text: 'Non controlliamo solo processi; rendiamo le informazioni accessibili e affidabili.' },
        { title: 'Tracciabilità', text: 'Ogni modulo consente di seguire attività, documenti, supporto e decisioni.' },
      ],
    },
    services: {
      eyebrow: 'Cosa facciamo',
      title: 'Centralizziamo le operazioni HR',
      description: 'SMART RH integra moduli chiave per gestire personale, documenti, richieste interne e analisi executive.',
      items: [
        { title: 'Utenti', text: 'Registrazione, consultazione e amministrazione dei dipendenti.' },
        { title: 'Presenze', text: 'Entrata e uscita tramite QR.' },
        { title: 'Contratti', text: 'Gestione contrattuale e generazione documentale.' },
        { title: 'Paghe', text: 'Registri di pagamento e controllo.' },
        { title: 'Ferie', text: 'Richieste, approvazione e saldo.' },
        { title: 'Documentazione', text: 'Credenziale, contratto PDF e fascicolo digitale.' },
        { title: 'Supporto', text: 'Ticket interni e follow-up amministrativo.' },
        { title: 'ETL', text: 'Report, analisi e visualizzazione dati.' },
      ],
    },
    story: {
      eyebrow: 'Umanizza il tuo brand',
      title: 'Una storia costruita attorno alle persone',
      description:
        'SMART RH nasce dal bisogno di avvicinare la tecnologia ai team umani. Il suo scopo è semplificare il lavoro amministrativo, dare trasparenza ai collaboratori e supportare decisioni HR migliori.',
    },
    mission: {
      missionTitle: 'Missione',
      missionText: 'Digitalizzare e ottimizzare la gestione HR con una piattaforma accessibile, sicura ed efficiente.',
      visionTitle: 'Visione',
      visionText: 'Essere una soluzione integrale che collega aziende e collaboratori con tecnologia affidabile, moderna e umana.',
      purposeTitle: 'Scopo',
      purposeText: 'Ridurre il carico amministrativo e migliorare l’esperienza lavorativa con processi chiari e automatizzati.',
    },
    values: {
      eyebrow: 'Valori',
      title: 'Principi che guidano la nostra piattaforma',
      items: ['Innovazione', 'Trasparenza', 'Sicurezza', 'Responsabilità', 'Efficienza', 'Focus umano'],
    },
    contact: {
      eyebrow: 'Contatto',
      title: 'Parliamo della trasformazione del tuo HR',
      description: 'Compila il modulo o visita la nostra sede per scoprire come SMART RH può rafforzare la gestione interna.',
      name: 'Nome completo',
      email: 'Email',
      company: 'Azienda',
      message: 'Messaggio',
      button: 'Invia messaggio',
      locationTitle: 'Ufficio principale',
      locationText: 'Città del Messico, Messico',
      schedule: 'Lunedì a venerdì · 9:00 - 18:00',
    },
    footer: {
      description: 'Suite aziendale per la gestione moderna delle Risorse Umane.',
      rights: 'Tutti i diritti riservati.',
    },
  },
};