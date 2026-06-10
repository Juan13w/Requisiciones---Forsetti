'use client';
import React from 'react';
import Slider from 'react-slick';
import Image from 'next/image';
import './Carousel.css';

// Importa los estilos de slick-carousel
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

const Carousel = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    fade: true,
    cssEase: 'linear',
    arrows: false,
    // Mejoras de accesibilidad
    accessibility: true,
    focusOnSelect: false,
    // Evita que los slides ocultos sean enfocables
    focusOnChange: false,
    // Asegura que solo el slide activo sea accesible
    lazyLoad: 'ondemand' as const, // Tipo correcto para lazyLoad
    // Desactiva el tabindex en los slides no activos
    useCSS: true,
  };

  const images = [
    // Rutas corregidas sin el prefijo 'public' ya que Next.js ya apunta a la carpeta public
    { src: '/images/imagenes/imgcrs1.png', alt: 'Sistema de Requisiciones' },
    { src: '/images/imagenes/imgcrs2.png', alt: 'Gestión Eficiente' },
    { src: '/images/imagenes/imgcrs3.png', alt: 'Control Total' },
  ];

  return (
    <div className="carousel-container">
      <Slider {...settings}>
        {images.map((image, index) => (
          <div key={index} className="carousel-slide">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              style={{ objectFit: 'cover' }}
              priority={index === 0}
            />
            <div className="carousel-caption">
              <h2>Sistema Integral de Requisiciones Empresariales </h2>
              <p>Optimiza el proceso de solicitudes entre coordinadores de área y el departamento de compras.</p>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Carousel;
