import React from 'react';
import { Mail, Zap, Compass, CheckCircle, Facebook, Instagram } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { FaUserGraduate } from 'react-icons/fa6';
import { PiGraduationCapLight } from 'react-icons/pi';
import { BsBoxes } from 'react-icons/bs';
import { PiPottedPlantLight } from "react-icons/pi";

// --- DEFINICIONES REQUERIDAS ---
// 1. Datos de Marcas
const partnerBrands = [
    { name: "Hunter", logoUrl: "/logos/hunter.jpg" },
    { name: "Rain Bird", logoUrl: "/logos/rainbird.jpg" },
    { name: "Vulcano", logoUrl: "/logos/vulcano.png" },
    { name: "Mec", logoUrl: "/logos/mec.png" },
    { name: "Trebo", logoUrl: "/logos/trebo.png" },
    { name: "Makinthal", logoUrl: "/logos/makinthal.jpg" },
    { name: "MotorArg", logoUrl: "/logos/motorarg.png" },
    { name: "Pedrollo", logoUrl: "/logos/pedrollo.png" },
    { name: "Hidroten", logoUrl: "/logos/hidroten.jpeg" },
    { name: "Lacus", logoUrl: "/logos/lacus.jpeg" },
    { name: "Elektrim", logoUrl: "/logos/elektrim.png" },
    { name: "Sensei", logoUrl: "/logos/sensei.png" },
    { name: "Senninger", logoUrl: "/logos/senninger.png" },
    { name: "Plimat", logoUrl: "/logos/plimat.png" },
    { name: "Polimex", logoUrl: "/logos/polimex.jpeg" },
    { name: "Waterplast", logoUrl: "/logos/waterplast.png" },
];

// **********************************
// 3. Datos de Redes Sociales (NUEVA DEFINICIÓN)
const socialLinks = [
    { icon: Instagram, href: "https://instagram.com/irridelta", label: "Instagram", color: "text-pink-600", hover: "hover:bg-pink-600" },
    { icon: Facebook, href: "https://www.facebook.com/p/Irridelta-100064054083065/?locale=es_LA", label: "Facebook", color: "text-blue-600", hover: "hover:bg-blue-600" }
];
// **********************************

// 2. Componente de Tarjeta de Características (FeatureCard)
const FeatureCard = ({ icon: Icon, title, description, color }) => (
    <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-lg transform hover:scale-105 transition duration-300">
        <Icon className={`w-10 h-10 mb-4 ${color}`} />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
    </div>
);
// -----------------------------


function Home() {
    return (

        <div className="w-full bg-white">
            
            <Helmet>
                {/* Etiqueta <title> (La más importante para SEO) */}
                <title>IRRIDELTA | Soluciones integrales de Riegos y Piscinas en Argentina</title>

                {/* Etiqueta <meta name="description"> */}
                <meta 
                    name="description" 
                    content="IRRIDELTA, expertos con 30+ años en sistemas de riego y piscinas. Marcas líderes, stock integral y soporte técnico asegurado."
                />

                {/* Etiquetas Open Graph (OG) para redes sociales */}
                <meta property="og:title" content="IRRIDELTA | Riego y Piscinas" />
                <meta property="og:description" content="Sistemas de riego eficientes, insumos de primeras marcas y asesoramiento especializado en Argentina." />
                <meta property="og:url" content="http://www.irridelta.com.ar/" />
                {/* Debes reemplazar esta URL por la URL absoluta de la imagen de previsualización (tu logo o un banner atractivo) */}
                <meta property="og:image" content="http://localhost:5173/logo-irridelta-nav.png" />
                <meta property="og:type" content="website" />

                {/* Etiqueta Canónica (Recomendada) */}
                <link rel="canonical" href="http://www.irridelta.com.ar/" />
            </Helmet>

            {/* 1. Banner Principal (Hero Section) */}
            <section className="relative h-[60vh] md:h-[80vh] bg-cover bg-center" 
                style={{ backgroundImage: "url('/ampliada 1.jpg')" }}> 
                <div className="absolute inset-0 bg-black opacity-40"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center relative z-10 text-white">
                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                        La Solución Integral para tu <span className="text-green-400">Riego</span> y para tu <span className="text-blue-400">Piscina</span>.
                    </h1>
                    <p className="mt-4 text-xl md:text-2xl font-light">
                        Insumos de primera marca, experiencia de más de 30 años y soporte técnico garantizado.
                    </p>
                    
                </div>
            </section>

            {/* 2. Nuestro Valor Diferencial */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
                        ¿Por qué elegir IRRIDELTA?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <FeatureCard icon={PiPottedPlantLight} title="Experiencia Comprobada" description="Más de 30 años en el rubro nos avalan. Nuestro conocimiento nos permite asesorarte de la mejor manera." color="text-yellow-600" />
                        <FeatureCard icon={CheckCircle} title="Calidad Garantizada" description="Distribuidores oficiales de marcas líderes. Solo productos de primer nivel y confiabilidad." color="text-green-600" />
                        <FeatureCard icon={PiGraduationCapLight} title="Soporte y Capacitación" description="Centro de formación y referentes para instaladores, con soporte técnico y jornadas de capacitación especializadas." color="text-blue-600" />
                        <FeatureCard icon={BsBoxes} title="Stock Integral" description="Todo lo que necesitas para riegos y piscinas en un solo lugar, para optimizar tus tiempos." color="text-red-600" />
                    </div>
                </div>
            </section>
            
            {/* 3. NUEVA SECCIÓN: Conexión Social */}
            <section className="py-12  bg-gray-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">
                        Seguínos en nuestras redes
                    </h2>
                    <div className="flex justify-center space-x-6">
                        {socialLinks.map((link) => (
                            <a 
                                key={link.label}
                                href={link.href} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`p-4 rounded-full bg-gray-100 ${link.color} transition duration-300 transform hover:scale-110 ${link.hover} hover:text-white shadow-md`}
                                aria-label={`Visita nuestro perfil de ${link.label}`}
                            >
                                <link.icon className="w-8 h-8" />
                            </a>
                        ))}
                    </div>
                </div>
            </section>
            {/* FIN NUEVA SECCIÓN */}

            {/* 4. Marcas Colaboradoras (Antes Punto 3) */}
            <section className="py-16 bg-gray-50"> {/* Cambié el fondo a gris para darle contraste */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
                        Trabajamos con las Marcas Líderes
                    </h2>
                    
                    {/* Contenedor Fijo: Usamos Grid para centrar las marcas y adaptar el ancho */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 justify-items-center">
                        {partnerBrands.map((brand, index) => (
                            <div 
                                key={index} 
                                className="w-full p-4 bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 transform hover:scale-105 brand-logo-card-home"
                                // Asegúrate de que la clase 'brand-logo-card-home' esté definida en tu CSS global para el efecto hover/grayscale
                            >
                                <img 
                                    src={brand.logoUrl} 
                                    alt={`Logo de ${brand.name}`} 
                                    className="h-16 w-full object-contain" 
                                />
                                <p className="text-center mt-2 text-sm font-semibold text-gray-600">{brand.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. Llamada a la Acción Final (Antes Punto 4) */}
            <section className="py-16 bg-gray-900 text-white text-center">
                <h2 className="text-3xl font-extrabold mb-4">¿Listo para comenzar tu proyecto?</h2>
                <p className="text-xl mb-8">Contáctanos hoy para recibir asesoramiento de expertos.</p>
                <a href="/contacto" className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-8 rounded-lg transition duration-300 shadow-xl">
                    Dejanos tu consulta
                </a>
            </section>
        </div>
    );
}

export default Home;