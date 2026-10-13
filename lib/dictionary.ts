/**
 * Built-in translations of the shop's interface (French source -> other languages).
 * Applied to every rendered text node that matches exactly, and used by t() in React.
 * The admin can add or override entries per language (Setting "dictionary").
 */
type Dict = Record<string, string>;

const en: Dict = {
  // header / navigation
  'CATÉGORIES': 'CATEGORIES', 'Rechercher des produits': 'Search products', 'Search': 'Search',
  'Promotions': 'Deals', 'Nos marques': 'Our brands', 'Nos Marques': 'Our brands', 'Déstockage': 'Clearance',
  'Liste de souhaits': 'Wishlist', "Se connecter / S'inscrire": 'Log in / Sign up', 'items': 'items',
  'Menu': 'Menu', 'Wishlist': 'Wishlist', 'Panier': 'Cart', 'Accueil': 'Home', 'Fermer': 'Close',
  // categories
  'Soins du Visage': 'Face Care', 'Nettoyant Visage': 'Face Cleanser', 'Démaquillant': 'Makeup Remover',
  'Tonique Visage': 'Face Toner', 'Taches': 'Dark Spots', 'Soin Contour des Yeux': 'Eye Care',
  'Soins du Corps': 'Body Care', 'Brume Corps': 'Body Mist', 'Hydratation Corps': 'Body Moisturizer',
  'Déodorant': 'Deodorant', 'Soin Mains': 'Hand Care', 'Soin Pieds': 'Foot Care', 'Toilette Intime': 'Intimate Hygiene',
  'Soins pour Hommes': "Men's Care", 'Préservatifs & Lubrifiants': 'Condoms & Lubricants',
  'Soins du Corps pour Homme': "Men's Body Care", 'Déodorants pour Homme': "Men's Deodorants",
  'Hygiène pour Homme': "Men's Hygiene", 'Soins Visage Homme': "Men's Face Care", 'Parfums Hommes': "Men's Fragrances",
  'Soins Cheveux': 'Hair Care', 'Après-Shampoing': 'Conditioner', 'Cheveux Gras': 'Oily Hair', 'Cheveux Secs': 'Dry Hair',
  'Chute de Cheveux : Produits & Traitements': 'Hair Loss: Products & Treatments',
  'Anti Poux : traitement et shampoings': 'Head Lice: Treatments & Shampoos', 'Soin & Masque & Gommage': 'Care, Masks & Scrubs',
  'Shampoing pour Bébé': 'Baby Shampoo', 'Santé et Bien-être': 'Health & Wellness',
  'Compléments alimentaires & Vitamines': 'Supplements & Vitamins', 'Huiles Santé': 'Health Oils',
  'Matériel médical et accessoires': 'Medical Equipment & Accessories', 'Muscles et articulations': 'Muscles & Joints',
  'Bandes et pansements': 'Bandages & Dressings', 'Tensiometre': 'Blood Pressure Monitors', 'Thermomètres': 'Thermometers',
  'Produits pour Bébé': 'Baby Products', 'Coffrets bébé': 'Baby Gift Sets', 'Hydratation bébé': 'Baby Moisturizers',
  'Couches': 'Diapers', 'Lingettes Bébé': 'Baby Wipes', 'Produits d’Allaitement': 'Breastfeeding Products',
  'Coussinets d’allaitement': 'Nursing Pads', 'Soins Mamelons': 'Nipple Care', 'Tires Lait': 'Breast Pumps',
  'Puériculture': 'Childcare', 'Biberons et tétines': 'Bottles & Teats', 'Stérilisateurs': 'Sterilizers',
  'Toilette et bain bébé': 'Baby Bath & Toiletries', 'K-BEAUTY': 'K-BEAUTY', 'PROMOTIONS': 'DEALS',
  'Crèmes Solaires & Après Soleil': 'Sunscreens & After-Sun', 'Crèmes Solaires Visage': 'Face Sunscreens',
  'Peaux sensibles': 'Sensitive Skin', 'BEST SELLER': 'BEST SELLERS', 'Maquillage': 'Makeup',
  // footer
  'Beautymall.ma est votre parapharmacie de référence au Maroc. Avec plus de 10 ans d’expérience dans la distribution de produits parapharmaceutiques, nous proposons les prix les plus attractifs du marché. Nous mettons également à votre disposition des conseillères spécialisées en beauté et santé pour mieux vous conseiller.Nos partenariats nous permettent de vous proposer les produits de parapharmacie à des prix discount. Nous appliquons tout au long de l’année 33% de réduction. Nous proposons des promotions, des codes promo, et des cadeaux régulièrement. Afin de profiter de nos offres, nous vous invitons à visiter beautymall.ma très souvent !':
    'Beautymall.ma is your go-to online pharmacy in Morocco. With more than 10 years of experience in distributing pharmacy and beauty products, we offer the most attractive prices on the market, along with beauty and health advisors to help you choose. Thanks to our partnerships we sell pharmacy products at discount prices, with 33% off all year round, plus regular promotions, promo codes and gifts. Visit beautymall.ma often to enjoy our offers!',
  'Contact': 'Contact', 'Lundi à vendredi : 9h à 18h - Samedi : 9h à 13h': 'Monday to Friday: 9am–6pm – Saturday: 9am–1pm',
  'Conditions générales de vente': 'Terms of sale', 'Politique de confidentialité': 'Privacy policy',
  'Politique de livraison': 'Delivery policy', 'Social links:': 'Follow us:', 'BeautyMall © 2025 By ❤️, Tous Droits Réservés': 'BeautyMall © 2025 By ❤️, All rights reserved',
  // cookie banner / chat / login
  'Notre site web utilise des cookies': 'Our website uses cookies',
  "Ce site web utilise des cookies pour vous garantir une expérience optimale. Pour plus d'informations sur la façon dont nous utilisons les cookies, vous pouvez lire notre":
    'This website uses cookies to give you the best experience. To learn more about how we use cookies, please read our',
  'Tout refuser': 'Reject all', 'Accepter tout': 'Accept all', 'Personnaliser les préférences de consentement': 'Customize consent preferences',
  'Enregistrer mes préférences': 'Save my preferences', 'Afficher plus': 'Show more', 'Contactez-nous': 'Contact us',
  'se connecter': 'log in', 'Téléphone ou e-mail': 'Phone or email', 'Mot de passe': 'Password', 'Log in': 'Log in',
  'Mot de passe oublié ?': 'Forgot your password?', 'Mémoriser Les informations': 'Remember me',
  'Pas encore de compte ?': 'No account yet?', 'Créer un compte': 'Create an account',
  // product page
  'Ajouter au panier': 'Add to cart', 'Ajouter Au Panier': 'Add to cart', 'UGS': 'SKU', 'Add to wishlist': 'Add to wishlist',
  'Browse wishlist': 'View wishlist', 'Qui sommes-nous ?': 'About us',
  'BeautyMall.ma est une parapharmacie marocaine spécialisée dans les produits de beauté, de soin et de bien-être. Nous vous proposons une large sélection de produits et de marques pour répondre à vos besoins au quotidien, en ligne et dans notre showroom.':
    'BeautyMall.ma is a Moroccan pharmacy store specialised in beauty, skincare and wellness products. We offer a wide selection of products and brands for your everyday needs, online and in our showroom.',
  'Notre engagement': 'Our commitment',
  'Chez BeautyMall.ma, nous mettons l’accent sur la qualité, l’authenticité et la satisfaction de nos clients. Notre objectif est de vous offrir une expérience d’achat simple, fiable et agréable.':
    'At BeautyMall.ma we focus on quality, authenticity and customer satisfaction. Our goal is a simple, reliable and pleasant shopping experience.',
  'Toujours à votre écoute': 'Always here for you',
  'Une question sur un produit, une commande ou besoin d’un conseil ? Notre équipe est disponible pour vous accompagner et répondre à toutes vos questions.':
    'A question about a product or an order, or need advice? Our team is here to help and answer all your questions.',
  'Par téléphone ou whatsapp : 06 61 93 37 67 / 06 62 69 10 87': 'By phone or WhatsApp: 06 61 93 37 67 / 06 62 69 10 87',
  'Sur Instagram : @beautymallma': 'On Instagram: @beautymallma',
  'People watching this product now!': 'people are viewing this product right now!',
  'Authenticité garantie': 'Guaranteed authentic', 'Livraison gratuite selon le panier': 'Free delivery depending on your cart',
  'Satisfait ou remboursé': 'Satisfaction guaranteed', 'En stock': 'In stock', 'Rupture de stock': 'Out of stock',
  'Lire la suite': 'Read more', 'en stock': 'in stock',
  // archive
  'Filtrer par prix': 'Filter by price', 'Filtrer': 'Filter', 'Par marque': 'By brand', 'Find a Marque': 'Find a brand',
  'Catégories de produits': 'Product categories', 'Sélectionner une catégorie': 'Select a category', 'Show': 'Show',
  'Tri par popularité': 'Sort by popularity', 'Tri par notes moyennes': 'Sort by average rating',
  'Tri du plus récent au plus ancien': 'Sort by latest', 'Tri par tarif croissant': 'Sort by price: low to high',
  'Tri par tarif décroissant': 'Sort by price: high to low', 'Aucun produit trouvé': 'No products found',
  'Affichage du seul résultat': 'Showing the single result', 'Affichage de {from}–{to} sur {total} résultats': 'Showing {from}–{to} of {total} results',
  'Aucun produit ne correspond à votre sélection.': 'No products match your selection.',
  'Aucun produit ne correspond à votre recherche.': 'No products match your search.',
  'Boutique': 'Shop', 'Marques': 'Brands', 'Recherche': 'Search', 'Résultats de recherche : “{q}”': 'Search results: “{q}”',
  'Voir tous les résultats': 'View all results',
  // home (section titles)
  'LES BOUTIQUES OFFICIELLES': 'OFFICIAL BRAND STORES', 'Recherche par Actif': 'Shop by ingredient', 'Nos tarifs de livraison': 'Our delivery rates',
  'Des offres imbattables sur vos marques préférées': 'Unbeatable deals on your favourite brands',
  'Livraison gratuite partout au Maroc (voir nos conditions )': 'Free delivery all over Morocco (see conditions)',
  'Paiement par Carte Sécurisé': 'Secure card payment', 'Service client à votre écoute': 'Customer service at your side',
  // cart / checkout / account
  'Votre panier est vide.': 'Your cart is empty.', 'Retour à la boutique': 'Return to shop', 'Sous-total :': 'Subtotal:',
  'Voir le panier': 'View cart', 'Commander': 'Checkout', 'Votre panier est actuellement vide.': 'Your cart is currently empty.',
  'Avant de procéder au paiement, vous devez ajouter des produits à votre panier.': 'Before checking out you need to add some products to your cart.',
  'Produit': 'Product', 'Prix': 'Price', 'Quantité': 'Quantity', 'Sous-total': 'Subtotal', 'Total panier': 'Cart totals',
  'Expédition': 'Shipping', 'Total': 'Total', 'Valider la commande': 'Proceed to checkout', 'Commande': 'Checkout',
  'Calculée à la commande selon votre ville.': 'Calculated at checkout based on your city.',
  'Détails de facturation': 'Billing details', 'Prénom': 'First name', 'Nom': 'Last name', 'Téléphone': 'Phone',
  'Adresse e-mail': 'Email address', 'Ville': 'City', 'Adresse': 'Address', '(facultatif)': '(optional)',
  'Notes de commande': 'Order notes', 'Votre commande': 'Your order', 'Indiquez votre ville': 'Enter your city',
  'Livraison gratuite': 'Free delivery', 'Gratuite dès {n} DH': 'Free from {n} DH', 'Paiement à la livraison': 'Cash on delivery',
  'Payez en espèces à la livraison.': 'Pay in cash on delivery.', 'Traitement…': 'Processing…', 'Code promo': 'Promo code',
  'Appliquer': 'Apply', 'Réduction': 'Discount', 'Retirer': 'Remove', 'Commande reçue': 'Order received',
  'Mon compte': 'My account', 'Mes commandes': 'My orders', 'Page introuvable': 'Page not found',
  'Numéro et nom de rue, quartier': 'Street number and name, district',
  'Commentaires concernant votre commande, ex. : consignes de livraison.': 'Notes about your order, e.g. delivery instructions.',
};

const ar: Dict = {
  'CATÉGORIES': 'الفئات', 'Rechercher des produits': 'ابحث عن المنتجات', 'Search': 'بحث',
  'Promotions': 'العروض', 'Nos marques': 'علاماتنا', 'Nos Marques': 'علاماتنا', 'Déstockage': 'تصفية المخزون',
  'Liste de souhaits': 'قائمة الأمنيات', "Se connecter / S'inscrire": 'تسجيل الدخول / إنشاء حساب', 'items': 'منتجات',
  'Menu': 'القائمة', 'Wishlist': 'المفضلة', 'Panier': 'السلة', 'Accueil': 'الرئيسية', 'Fermer': 'إغلاق',
  'Soins du Visage': 'العناية بالوجه', 'Nettoyant Visage': 'منظف الوجه', 'Démaquillant': 'مزيل المكياج',
  'Tonique Visage': 'تونر الوجه', 'Taches': 'البقع', 'Soin Contour des Yeux': 'العناية بمحيط العين',
  'Soins du Corps': 'العناية بالجسم', 'Brume Corps': 'رذاذ الجسم', 'Hydratation Corps': 'ترطيب الجسم',
  'Déodorant': 'مزيل العرق', 'Soin Mains': 'العناية باليدين', 'Soin Pieds': 'العناية بالقدمين', 'Toilette Intime': 'النظافة الحميمة',
  'Soins pour Hommes': 'العناية بالرجال', 'Préservatifs & Lubrifiants': 'الواقيات والمزلقات',
  'Soins du Corps pour Homme': 'العناية بجسم الرجل', 'Déodorants pour Homme': 'مزيلات العرق للرجال',
  'Hygiène pour Homme': 'نظافة الرجل', 'Soins Visage Homme': 'العناية بوجه الرجل', 'Parfums Hommes': 'عطور رجالية',
  'Soins Cheveux': 'العناية بالشعر', 'Après-Shampoing': 'بلسم الشعر', 'Cheveux Gras': 'الشعر الدهني', 'Cheveux Secs': 'الشعر الجاف',
  'Chute de Cheveux : Produits & Traitements': 'تساقط الشعر: منتجات وعلاجات',
  'Anti Poux : traitement et shampoings': 'القمل: علاجات وشامبو', 'Soin & Masque & Gommage': 'عناية وأقنعة ومقشرات',
  'Shampoing pour Bébé': 'شامبو الأطفال', 'Santé et Bien-être': 'الصحة والعافية',
  'Compléments alimentaires & Vitamines': 'المكملات الغذائية والفيتامينات', 'Huiles Santé': 'زيوت صحية',
  'Matériel médical et accessoires': 'معدات طبية وإكسسوارات', 'Muscles et articulations': 'العضلات والمفاصل',
  'Bandes et pansements': 'الضمادات واللصقات', 'Tensiometre': 'أجهزة قياس الضغط', 'Thermomètres': 'موازين الحرارة',
  'Produits pour Bébé': 'منتجات الأطفال', 'Coffrets bébé': 'علب هدايا الأطفال', 'Hydratation bébé': 'ترطيب الطفل',
  'Couches': 'الحفاضات', 'Lingettes Bébé': 'مناديل الأطفال', 'Produits d’Allaitement': 'منتجات الرضاعة',
  'Coussinets d’allaitement': 'وسادات الرضاعة', 'Soins Mamelons': 'العناية بالحلمات', 'Tires Lait': 'شفاطات الحليب',
  'Puériculture': 'مستلزمات الطفل', 'Biberons et tétines': 'الرضاعات والحلمات', 'Stérilisateurs': 'أجهزة التعقيم',
  'Toilette et bain bébé': 'استحمام الطفل', 'K-BEAUTY': 'الجمال الكوري', 'PROMOTIONS': 'العروض',
  'Crèmes Solaires & Après Soleil': 'واقيات الشمس وما بعد الشمس', 'Crèmes Solaires Visage': 'واقيات الشمس للوجه',
  'Peaux sensibles': 'البشرة الحساسة', 'BEST SELLER': 'الأكثر مبيعاً', 'Maquillage': 'المكياج',
  'Beautymall.ma est votre parapharmacie de référence au Maroc. Avec plus de 10 ans d’expérience dans la distribution de produits parapharmaceutiques, nous proposons les prix les plus attractifs du marché. Nous mettons également à votre disposition des conseillères spécialisées en beauté et santé pour mieux vous conseiller.Nos partenariats nous permettent de vous proposer les produits de parapharmacie à des prix discount. Nous appliquons tout au long de l’année 33% de réduction. Nous proposons des promotions, des codes promo, et des cadeaux régulièrement. Afin de profiter de nos offres, nous vous invitons à visiter beautymall.ma très souvent !':
    'بيوتي مول هي صيدليتكم المرجعية لمنتجات التجميل والعناية في المغرب. بخبرة تفوق 10 سنوات في توزيع منتجات شبه الصيدلة، نقدم لكم أفضل الأسعار في السوق، مع مستشارات متخصصات في الجمال والصحة لمساعدتكم. بفضل شراكاتنا نقدم تخفيضاً بنسبة 33% طوال السنة، إضافة إلى عروض وأكواد خصم وهدايا بانتظام. زوروا beautymall.ma باستمرار للاستفادة من عروضنا!',
  'Contact': 'اتصل بنا', 'Lundi à vendredi : 9h à 18h - Samedi : 9h à 13h': 'من الاثنين إلى الجمعة: 9 صباحاً – 6 مساءً، السبت: 9 صباحاً – 1 ظهراً',
  'Conditions générales de vente': 'الشروط العامة للبيع', 'Politique de confidentialité': 'سياسة الخصوصية',
  'Politique de livraison': 'سياسة التوصيل', 'Social links:': 'تابعونا:', 'BeautyMall © 2025 By ❤️, Tous Droits Réservés': 'بيوتي مول © 2025 ❤️، جميع الحقوق محفوظة',
  'Notre site web utilise des cookies': 'يستخدم موقعنا ملفات تعريف الارتباط',
  "Ce site web utilise des cookies pour vous garantir une expérience optimale. Pour plus d'informations sur la façon dont nous utilisons les cookies, vous pouvez lire notre":
    'يستخدم هذا الموقع ملفات تعريف الارتباط لضمان أفضل تجربة لكم. لمعرفة المزيد، يرجى قراءة',
  'Tout refuser': 'رفض الكل', 'Accepter tout': 'قبول الكل', 'Personnaliser les préférences de consentement': 'تخصيص تفضيلات الموافقة',
  'Enregistrer mes préférences': 'حفظ تفضيلاتي', 'Afficher plus': 'عرض المزيد', 'Contactez-nous': 'تواصل معنا',
  'se connecter': 'تسجيل الدخول', 'Téléphone ou e-mail': 'الهاتف أو البريد الإلكتروني', 'Mot de passe': 'كلمة المرور', 'Log in': 'دخول',
  'Mot de passe oublié ?': 'نسيت كلمة المرور؟', 'Mémoriser Les informations': 'تذكرني',
  'Pas encore de compte ?': 'ليس لديك حساب؟', 'Créer un compte': 'إنشاء حساب',
  'Ajouter au panier': 'أضف إلى السلة', 'Ajouter Au Panier': 'أضف إلى السلة', 'UGS': 'رمز المنتج', 'Add to wishlist': 'أضف إلى المفضلة',
  'Browse wishlist': 'عرض المفضلة', 'Qui sommes-nous ?': 'من نحن؟',
  'BeautyMall.ma est une parapharmacie marocaine spécialisée dans les produits de beauté, de soin et de bien-être. Nous vous proposons une large sélection de produits et de marques pour répondre à vos besoins au quotidien, en ligne et dans notre showroom.':
    'بيوتي مول متجر مغربي متخصص في منتجات التجميل والعناية والعافية. نقدم لكم تشكيلة واسعة من المنتجات والعلامات التجارية لتلبية احتياجاتكم اليومية، عبر الإنترنت وفي معرضنا.',
  'Notre engagement': 'التزامنا',
  'Chez BeautyMall.ma, nous mettons l’accent sur la qualité, l’authenticité et la satisfaction de nos clients. Notre objectif est de vous offrir une expérience d’achat simple, fiable et agréable.':
    'في بيوتي مول نركز على الجودة والأصالة ورضا عملائنا. هدفنا أن نقدم لكم تجربة تسوق بسيطة وموثوقة وممتعة.',
  'Toujours à votre écoute': 'دائماً في خدمتكم',
  'Une question sur un produit, une commande ou besoin d’un conseil ? Notre équipe est disponible pour vous accompagner et répondre à toutes vos questions.':
    'لديك سؤال حول منتج أو طلب، أو تحتاج إلى نصيحة؟ فريقنا متاح لمرافقتك والإجابة عن جميع أسئلتك.',
  'Par téléphone ou whatsapp : 06 61 93 37 67 / 06 62 69 10 87': 'عبر الهاتف أو واتساب: 06 61 93 37 67 / 06 62 69 10 87',
  'Sur Instagram : @beautymallma': 'على إنستغرام: @beautymallma',
  'People watching this product now!': 'أشخاص يشاهدون هذا المنتج الآن!',
  'Authenticité garantie': 'أصالة مضمونة', 'Livraison gratuite selon le panier': 'توصيل مجاني حسب قيمة السلة',
  'Satisfait ou remboursé': 'راضٍ أو نعيد لك أموالك', 'En stock': 'متوفر', 'Rupture de stock': 'غير متوفر',
  'Lire la suite': 'اقرأ المزيد', 'en stock': 'متوفر',
  'Filtrer par prix': 'تصفية حسب السعر', 'Filtrer': 'تصفية', 'Par marque': 'حسب العلامة', 'Find a Marque': 'ابحث عن علامة',
  'Catégories de produits': 'فئات المنتجات', 'Sélectionner une catégorie': 'اختر فئة', 'Show': 'عرض',
  'Tri par popularité': 'الترتيب حسب الشعبية', 'Tri par notes moyennes': 'الترتيب حسب التقييم',
  'Tri du plus récent au plus ancien': 'الأحدث أولاً', 'Tri par tarif croissant': 'السعر: من الأقل إلى الأعلى',
  'Tri par tarif décroissant': 'السعر: من الأعلى إلى الأقل', 'Aucun produit trouvé': 'لم يتم العثور على منتجات',
  'Affichage du seul résultat': 'عرض النتيجة الوحيدة', 'Affichage de {from}–{to} sur {total} résultats': 'عرض {from}–{to} من أصل {total} نتيجة',
  'Aucun produit ne correspond à votre sélection.': 'لا توجد منتجات تطابق اختيارك.',
  'Aucun produit ne correspond à votre recherche.': 'لا توجد منتجات تطابق بحثك.',
  'Boutique': 'المتجر', 'Marques': 'العلامات التجارية', 'Recherche': 'بحث', 'Résultats de recherche : “{q}”': 'نتائج البحث: “{q}”',
  'Voir tous les résultats': 'عرض كل النتائج',
  'LES BOUTIQUES OFFICIELLES': 'المتاجر الرسمية', 'Recherche par Actif': 'البحث حسب المكوّن النشط', 'Nos tarifs de livraison': 'أسعار التوصيل',
  'Des offres imbattables sur vos marques préférées': 'عروض لا تقاوم على علاماتك المفضلة',
  'Livraison gratuite partout au Maroc (voir nos conditions )': 'توصيل مجاني في جميع أنحاء المغرب (حسب الشروط)',
  'Paiement par Carte Sécurisé': 'دفع آمن بالبطاقة', 'Service client à votre écoute': 'خدمة عملاء في خدمتكم',
  'Votre panier est vide.': 'سلتك فارغة.', 'Retour à la boutique': 'العودة إلى المتجر', 'Sous-total :': 'المجموع الفرعي:',
  'Voir le panier': 'عرض السلة', 'Commander': 'إتمام الطلب', 'Votre panier est actuellement vide.': 'سلتك فارغة حالياً.',
  'Avant de procéder au paiement, vous devez ajouter des produits à votre panier.': 'قبل إتمام الطلب، يجب إضافة منتجات إلى سلتك.',
  'Produit': 'المنتج', 'Prix': 'السعر', 'Quantité': 'الكمية', 'Sous-total': 'المجموع الفرعي', 'Total panier': 'إجمالي السلة',
  'Expédition': 'التوصيل', 'Total': 'المجموع', 'Valider la commande': 'متابعة الطلب', 'Commande': 'الطلب',
  'Calculée à la commande selon votre ville.': 'تُحسب عند الطلب حسب مدينتك.',
  'Détails de facturation': 'معلومات الطلب', 'Prénom': 'الاسم', 'Nom': 'النسب', 'Téléphone': 'الهاتف',
  'Adresse e-mail': 'البريد الإلكتروني', 'Ville': 'المدينة', 'Adresse': 'العنوان', '(facultatif)': '(اختياري)',
  'Notes de commande': 'ملاحظات الطلب', 'Votre commande': 'طلبك', 'Indiquez votre ville': 'أدخل مدينتك',
  'Livraison gratuite': 'توصيل مجاني', 'Gratuite dès {n} DH': 'مجاني ابتداءً من {n} درهم', 'Paiement à la livraison': 'الدفع عند الاستلام',
  'Payez en espèces à la livraison.': 'ادفع نقداً عند الاستلام.', 'Traitement…': 'جارٍ المعالجة…', 'Code promo': 'كود الخصم',
  'Appliquer': 'تطبيق', 'Réduction': 'الخصم', 'Retirer': 'إزالة', 'Commande reçue': 'تم استلام الطلب',
  'Mon compte': 'حسابي', 'Mes commandes': 'طلباتي', 'Page introuvable': 'الصفحة غير موجودة',
  'Numéro et nom de rue, quartier': 'رقم واسم الشارع، الحي',
  'Commentaires concernant votre commande, ex. : consignes de livraison.': 'ملاحظات حول طلبك، مثل تعليمات التوصيل.',
};

export const BUILTIN_DICTIONARY: Record<string, Dict> = { en, ar };

/** Translate a French source string, with {placeholders}. */
export function translate(dict: Dict | undefined, s: string, vars?: Record<string, string | number>) {
  let out = (dict && dict[s]) || s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
