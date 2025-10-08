import React from 'react';
import { useForm, ValidationError } from '@formspree/react';

function Contact() {
  const [state, handleSubmit] = useForm("xgvnyoqq");

  const inputClasses = "border border-gray-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition duration-150 w-full";
  const errorClasses = "text-red-500 text-sm mt-1";

  // Nueva función de manejo que “envía a Formspree + WhatsApp”
  const handleSubmitWithWhatsApp = async (e) => {
    e.preventDefault();  // evitar el submit normal

    // primero, enviamos al Formspree
    // handleSubmit espera el evento como parámetro
    const formspreePromise = handleSubmit(e);

    // extraemos valores del formulario para el WhatsApp
    const form = e.target;
    const nombre = form.nombre.value;
    const email = form.email.value;
    const telefono = form.telefono.value;
    const mensaje = form.mensaje.value;

    const texto = `Hola, soy ${nombre}.\nEmail: ${email}\nTeléfono: ${telefono}\nConsulta: ${mensaje}`;
    const numeroWhatsApp = "5491162856483"; // reemplazá con tu número, en formato internacional sin “+”
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`;

    // Abrimos WhatsApp en otra pestaña o ventana
    window.open(url, "_blank");

    // Opcional: esperar a que Formspree termine, para hacer algo después
    try {
      await formspreePromise;
      // aquí podés hacer algo cuando el envío al mail haya concluido, si quisieras
    } catch (err) {
      console.error("Error en el envío a Formspree:", err);
    }
  };

  if (state.succeeded) {
    return (
      <div className="p-12 text-center bg-green-50 min-h-screen flex items-center justify-center">
        <p className="text-2xl font-semibold text-green-700 p-8 border border-green-300 rounded-lg shadow-lg">
          ¡Consulta enviada con éxito! Nos pondremos en contacto pronto. 👍
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 p-8 md:p-12 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-extrabold text-gray-800 border-b pb-2 mb-8">Contacto</h2>
        <h3 className="text-3xl font-bold text-gray-700 mb-6 text-center">¡Dejanos tu consulta!</h3>

        <form
          onSubmit={handleSubmitWithWhatsApp}
          className="max-w-lg mx-auto bg-white p-6 md:p-10 rounded-xl shadow-2xl flex flex-col gap-5"
        >
          <input
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            required
            className={inputClasses}
            disabled={state.submitting}
          />

          <input
            id="email"
            type="email"
            name="email"
            placeholder="Email"
            required
            className={inputClasses}
            disabled={state.submitting}
          />
          <ValidationError
            prefix="Email"
            field="email"
            errors={state.errors}
            className={errorClasses}
          />

          <input
            type="tel"
            name="telefono"
            placeholder="Teléfono"
            required
            className={inputClasses}
            disabled={state.submitting}
          />

          <textarea
            id="mensaje"
            name="mensaje"
            placeholder="Escribe tu mensaje o consulta aquí..."
            rows="5"
            required
            className={`${inputClasses} resize-none`}
            disabled={state.submitting}
          ></textarea>
          <ValidationError
            prefix="Mensaje"
            field="mensaje"
            errors={state.errors}
            className={errorClasses}
          />

          <button
            type="submit"
            disabled={state.submitting}
            className="bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition duration-300 shadow-md transform hover:scale-[1.01]"
          >
            {state.submitting ? 'Enviando...' : 'Enviar Consulta'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Contact;
