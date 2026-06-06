export interface Project {
  id: string;
  name: string;
  description: string;
  readme: string;
  topics: string[];
  language: string;
}

export interface DB {
  projects: Project[];
  social: { name: string; url: string }[];
  experience: { role: string; company: string; period: string; description: string }[];
}

const db: DB = {
  projects: [
    {
      id: "contab",
      name: "Contab",
      description: "Automatización de registro de facturas y boletas de compras y ventas",
      language: "TypeScript",
      topics: ["contabilidad", "facturación", "MYPES"],
      readme: `# Contab

Sistema para transferir documentos de compras y ventas a un programa contable.

Automatiza el registro de facturas y boletas de compras y ventas, eliminando la entrada manual de datos y reduciendo errores en la contabilidad diaria.

## Características
- Registro automatizado de facturas de compra y venta
- Transferencia directa a programas contables
- Reducción de errores humanos en el registro
- Interfaz sencilla para pequeñas empresas`,
    },
    {
      id: "contab2",
      name: "Contab2",
      description: "Extensión de Contab con recibos por honorarios y hoja de trabajo mensual",
      language: "TypeScript",
      topics: ["contabilidad", "honorarios", "exportación", "MYPES"],
      readme: `# Contab2

Extensión de Contab que añade gestión de recibos por honorarios y hoja de trabajo para la declaración mensual.

## Características
- Todo lo de Contab (registro de facturas y boletas)
- Gestión de recibos por honorarios
- Formato para exportación masiva de recibos por honorarios
- Hoja de trabajo para visualizar cómo quedaría la declaración del mes
- Reportes preliminares antes de enviar al contador`,
    },
    {
      id: "contabia",
      name: "ContabIA",
      description: "Contabilidad inteligente con IA para MYPES",
      language: "TypeScript",
      topics: ["IA", "contabilidad", "voz", "cardex", "MYPES"],
      readme: `# ContabIA

La evolución de Contab con inteligencia artificial integrada, diseñada especialmente para micro y pequeñas empresas (bodegas, vendedores ambulantes).

## Características actuales
- Todo lo de Contab y Contab2
- Conversión automática de dólares a soles usando IA
- Asistente inteligente para deducción de impuestos
- Recomendaciones personalizadas según el perfil del cliente

## Próximamente
- Emisión de facturas y boletas por voz usando IA
- Cardex para control de almacén de productos
- Interfaz optimizada para dispositivos móviles
- Soporte multimoneda en tiempo real`,
    },
  ],
  social: [
    { name: "GitHub", url: "https://github.com/dev101101" },
  ],
  experience: [
    {
      role: "Software Engineer",
      company: "Freelance",
      period: "2022 - Present",
      description: "Building scalable applications and backend services",
    },
  ],
};

export function getProjects(): Project[] {
  return db.projects;
}

export function getProjectById(id: string): Project | undefined {
  return db.projects.find((p) => p.id === id);
}

export default db;
