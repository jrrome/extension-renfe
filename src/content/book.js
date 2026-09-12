import { SEL } from "../shared/selectors.js";

// reserva en dos pasos, igual que el bot de escritorio: continuar{N} lleva a
// detailsFormalization y alli submitSiguiente confirma. ambos pasos navegan.

export function pulsarContinuar(numtren) {
  const boton = document.querySelector(SEL.botonContinuar(numtren));
  if (!boton || boton.disabled) return false;
  boton.click();
  return true;
}

export function pulsarConfirmar() {
  const boton = document.querySelector(SEL.botonSiguiente);
  if (!boton) return false;
  boton.click();
  return true;
}

export function hayRetoDeSeguridad() {
  const sms = document.querySelector(SEL.modalClaveSms);
  if (sms && sms.offsetParent !== null) return "clave sms";
  const captcha = document.querySelector(SEL.recaptcha);
  if (captcha && captcha.offsetParent !== null) return "captcha";
  return null;
}
