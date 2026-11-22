/**
 * CONTABLE - Parser de lenguaje natural + Categorizador inteligente
 */

const CATEGORIAS = {
  alimentacion: { emoji: '🍽️', palabras: ['almuerzo','comida','restaurante','desayuno','cena','hambre','tinto','café','pizza','hamburguesa','pollo','arroz','mercado','supermercado','tienda','frutas','verduras','panadería','pan','lunch','sushi','tacos','rappi','domicilio'] },
  transporte: { emoji: '🚗', palabras: ['taxi','uber','bus','metro','gasolina','combustible','parqueadero','parking','moto','transporte','pasaje','tiquete','peaje','recarga','sitp','buseta','colectivo','didi','beat','InDrive'] },
  salud: { emoji: '🏥', palabras: ['médico','doctor','farmacia','droga','medicina','medicamento','clínica','hospital','cita','examen','laboratorio','odontólogo','dentista','optómetra','gafas','lentes','cirugía'] },
  entretenimiento: { emoji: '🎬', palabras: ['netflix','spotify','amazon','disney','cine','película','concierto','evento','salida','bar','discoteca','rumba','fiesta','videojuego','juego','steam','xbox','playstation'] },
  servicios: { emoji: '💡', palabras: ['agua','luz','energía','gas','internet','wifi','telefono','celular','plan','arriendo','renta','administración','cable','tv','streaming','suscripción'] },
  educacion: { emoji: '📚', palabras: ['colegio','universidad','curso','clase','libro','matrícula','pensión','tutoría','capacitación','seminario','educación','estudio'] },
  ropa: { emoji: '👕', palabras: ['ropa','zapatos','camisa','pantalón','vestido','tenis','zapatillas','calzado','chaqueta','abrigo','accesorios','moda','zara','h&m','adidas','nike'] },
  tecnologia: { emoji: '💻', palabras: ['celular','computador','laptop','tablet','auriculares','cargador','cable','tecnología','apple','samsung','huawei','accesorios'] },
  hogar: { emoji: '🏠', palabras: ['mercado','arriendo','administración','hogar','casa','mueble','electrodoméstico','decoración','reparación','ferretería','pintura','llave','fontanero','electricista'] },
  salario: { emoji: '💼', palabras: ['salario','sueldo','nómina','pago','quincena','jornal','honorarios','freelance','proyecto','trabajo','empleo'] },
  ventas: { emoji: '🛍️', palabras: ['venta','vendí','cobré','cliente','servicio','negocio','emprendimiento'] },
  transferencia: { emoji: '🔄', palabras: ['transferencia','nequi','daviplata','bancolombia','bbva','transferencia','envío','recibí'] },
  mascotas: { emoji: '🐾', palabras: ['perro','gato','mascota','veterinario','concentrado','alimento','collar','correa','veterinaria'] },
  belleza: { emoji: '💅', palabras: ['peluquería','barbería','uñas','manicure','pedicure','corte','estética','spa','masaje','belleza','maquillaje','crema'] },
  otros: { emoji: '📦', palabras: [] }
};

const Parser = (() => {
  // Limpiar y parsear monto desde texto
  function parsearMonto(texto) {
    // Quitar puntos de miles y conservar decimales
    const limpio = texto.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(limpio);
    return isNaN(num) ? null : num;
  }

  // Formatear número como moneda colombiana
  function formatCOP(num, abreviar = false) {
    if (num === null || num === undefined || isNaN(num)) return '$0';
    if (abreviar) {
      if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'k';
    }
    return '$' + Math.round(num).toLocaleString('es-CO');
  }

  // Categorizar automáticamente por descripción
  function categorizarAuto(descripcion) {
    if (!descripcion) return 'otros';
    const desc = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [cat, data] of Object.entries(CATEGORIAS)) {
      for (const palabra of data.palabras) {
        const pal = palabra.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (desc.includes(pal)) return cat;
      }
    }
    return 'otros';
  }

  // Parsear texto libre: "gasté 45 en almuerzo"
  function parsearTextoLibre(texto) {
    const resultado = { monto: null, descripcion: '', tipo: null, categoria: null };
    const t = texto.toLowerCase().trim();

    // Detectar tipo
    const palabrasEgreso = ['gasté','gaste','pagué','pague','compré','compre','salió','salio','costó','costo','di','pagó','pago','invertí','invirti'];
    const palabrasIngreso = ['me pagaron','recibí','recibi','gané','gane','entró','entro','me dieron','cobré','cobre','vendí','vendi','salario','sueldo','nómina','nomina'];

    for (const p of palabrasIngreso) {
      if (t.includes(p)) { resultado.tipo = 'ingreso'; break; }
    }
    if (!resultado.tipo) {
      for (const p of palabrasEgreso) {
        if (t.includes(p)) { resultado.tipo = 'egreso'; break; }
      }
    }

    // Extraer monto (números en el texto)
    const matchMonto = texto.match(/[\d.,]+/g);
    if (matchMonto) {
      for (const m of matchMonto) {
        const n = parsearMonto(m);
        if (n && n > 0) { resultado.monto = n; break; }
      }
    }

    // Extraer descripción (lo que viene después de "en ", "para ", "por ")
    const matchDesc = t.match(/(?:en|para|por)\s+(.+?)(?:\s+con|\s+a\s|\s+el\s|\s+los\s|$)/);
    if (matchDesc) {
      resultado.descripcion = matchDesc[1].trim();
    } else {
      // Usar todo el texto sin los números como descripción
      resultado.descripcion = texto.replace(/[\d.,]+/g, '').replace(/gasté|gaste|pagué|pague|recibí|recibi|me pagaron|gané|gane|en\s|para\s|por\s/gi, '').trim();
    }

    resultado.categoria = categorizarAuto(resultado.descripcion || texto);
    return resultado;
  }

  // Obtener rango de fechas para un período
  function getRangoFecha(periodo) {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth();
    const dia = hoy.getDay(); // 0=dom
    const fechaHoy = hoy.toISOString().split('T')[0];

    switch (periodo) {
      case 'hoy': {
        return { desde: fechaHoy, hasta: fechaHoy };
      }
      case 'semana': {
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
        return { desde: lunes.toISOString().split('T')[0], hasta: fechaHoy };
      }
      case 'mes': {
        const desde = new Date(año, mes, 1).toISOString().split('T')[0];
        return { desde, hasta: fechaHoy };
      }
      case 'año': {
        const desde = new Date(año, 0, 1).toISOString().split('T')[0];
        return { desde, hasta: fechaHoy };
      }
      default: return { desde: null, hasta: null };
    }
  }

  // Nombre del mes en español
  function nombreMes(num) {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return meses[num] || '';
  }

  function nombreMesLargo(num) {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return meses[num] || '';
  }

  // Formatear fecha legible
  function fechaLegible(isoDate) {
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (isoDate === hoy) return 'Hoy';
    if (isoDate === ayer) return 'Ayer';
    const [y, m, d] = isoDate.split('-');
    return `${parseInt(d)} ${nombreMes(parseInt(m) - 1)}`;
  }

  // Calcular días entre dos fechas
  function diasEntre(fecha1, fecha2) {
    const d1 = new Date(fecha1);
    const d2 = new Date(fecha2);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  // Calcular datos de un préstamo con interés
  function calcularPrestamo(montoOriginal, interesMensual, numCuotas) {
    if (!interesMensual || interesMensual === 0) {
      return {
        cuotaMensual: numCuotas ? montoOriginal / numCuotas : null,
        totalPagar: montoOriginal,
        totalInteres: 0
      };
    }
    const i = interesMensual / 100;
    if (numCuotas) {
      // Sistema francés (cuota fija)
      const cuota = montoOriginal * (i * Math.pow(1 + i, numCuotas)) / (Math.pow(1 + i, numCuotas) - 1);
      const totalPagar = cuota * numCuotas;
      return {
        cuotaMensual: cuota,
        totalPagar,
        totalInteres: totalPagar - montoOriginal
      };
    }
    return { cuotaMensual: null, totalPagar: null, totalInteres: null };
  }

  // Proyección del mes
  function proyectarMes(movimientos) {
    const hoy = new Date();
    const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const diaActual = hoy.getDate();
    const diasRestantes = diasMes - diaActual;

    const mesActual = hoy.toISOString().slice(0, 7); // "2026-11"
    const movsDelMes = movimientos.filter(m => m.fecha.startsWith(mesActual));

    const ingresosMes = movsDelMes.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const egresosMes = movsDelMes.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);

    const promedioEgresoDiario = diaActual > 0 ? egresosMes / diaActual : 0;
    const proyeccionEgresos = egresosMes + (promedioEgresoDiario * diasRestantes);
    const proyeccionSaldo = ingresosMes - proyeccionEgresos;

    return {
      ingresosMes, egresosMes,
      saldoActual: ingresosMes - egresosMes,
      proyeccionEgresos,
      proyeccionSaldo,
      diasRestantes,
      promedioEgresoDiario,
      porcentajeMes: Math.round((diaActual / diasMes) * 100)
    };
  }

  return {
    parsearMonto, formatCOP, categorizarAuto, parsearTextoLibre,
    getRangoFecha, nombreMes, nombreMesLargo, fechaLegible, diasEntre,
    calcularPrestamo, proyectarMes, CATEGORIAS
  };
})();
