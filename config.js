// V1.5.1: documento PRIVADO. No incorpora credenciales secretas.
// Base estable funcional preservada: V1.4 (navegacion y observaciones).
window.DASHBOARD_SOURCE = Object.freeze({
  url: 'https://docs.google.com/spreadsheets/d/1GWZBqmUx4Z5WvKWnnqjDfLVQ7LpGzPH6/edit?gid=1721163515#gid=1721163515',
  access: 'private',
  autoLoad: false, // OAuth requiere autorizacion del usuario, no solicitar acceso anonimo.
  refreshMinutes: 15
});
// Client ID es un identificador publico para OAuth en el navegador.
// NO incluya aqui el client_secret del JSON proporcionado por Google.
window.DASHBOARD_GOOGLE_CLIENT_ID = '958927898893-ig0brj6an7leptqc5gqtstflslvufjgt.apps.googleusercontent.com';
