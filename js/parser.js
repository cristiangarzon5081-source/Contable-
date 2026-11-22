/**
 * CONTABLE - Parser de lenguaje natural + Categorizador inteligente
 */

// ── CATEGORÍAS BASE (predefinidas) ────────────────────────────────────────────
// Editables en la pantalla de Categorías (nombre/emoji).
// Las palabras clave son el motor de detección automática.
const CATEGORIAS = {
  alimentacion: {
    emoji: '🍽️', nombre: 'Alimentación', tipo: 'egreso',
    palabras: [
      'almuerzo','comida','restaurante','desayuno','cena','merienda','onces','tinto','cafe','cafeteria',
      'pizza','hamburguesa','hamburgesa','hotdog','perro caliente','pollo','arroz','pasta','sopa',
      'sancocho','bandeja','arepas','empanadas','tamales','patacon','mondongo','changua','caldo','frijoles',
      // Frutas específicas (evita confusión con marcas de ropa como "Mango")
      'frutas','verduras','legumbres','hortalizas','ensalada',
      'mango','mangos','banano','bananos','platano','platanos','naranja','naranjas',
      'manzana','manzanas','uvas','fresas','papaya','melon','sandia','pera','durazno',
      'maracuya','guanabana','lulo','mora','tomate de mesa','zanahoria','papa','cebolla',
      'lechuga','espinaca','brocoli','pepino','habichuela','arveja','lenteja',
      'aguacate','aguacates','limon','limones','mandarina','mandarinas',
      // Frutos secos y semillas
      'nuez','nueces','mani','manes','almendra','almendras','pistacho','pistachos',
      'marañon','maranon','anacardo','cashew','nogal','macadamia','avellana','avellanas',
      'semillas','chia','quinoa','granola','avena','cereal','maiz','trigo',
      // Lácteos y proteínas
      'leche','yogur','yogurt','queso','mantequilla','crema de leche','huevos','huevo',
      'carne','pollo asado','res','cerdo','salmon','atun','sardina','mariscos',
      // Granos y otros
      'lentejas','garbanzos','soya','tofu','proteina vegetal',
      'mercado','supermercado','tienda','minimercado','galeria','plaza de mercado',
      'exito','carulla','jumbo','olimpica','d1','ara','justo y bueno','makro','surtifamiliar',
      'rappi','domicilio','pedido','ifood','uber eats','dominos','pizza hut',
      'snack','dulces','chocolate','galletas','jugos','bebidas','gaseosa','cerveza','aguardiente',
      'ron','vino','licor','trago','helado','postres','panaderia','pan','tostadas','croissant',
      'mcdonalds','burger king','kentucky','kfc','subway','crepes','wok','frisby','presto',
      'el corral','popsy','sushi','tacos','burritos','lunch','brunch',
      'comi','desayune','almhorce','cene','tome','bebi','compre comida','pedi domicilio',
      'compre frutas','compre verduras','compre en el mercado'
    ]
  },
  transporte: {
    emoji: '🚗', nombre: 'Transporte', tipo: 'egreso',
    palabras: [
      'taxi','uber','didi','beat','indriver','cabify',
      'bus','buseta','colectivo','sitp','metro','transmilenio','mio','metroplus','metro cable',
      'tren','tren de la sabana',
      'gasolina','combustible','diesel','acpm','full','galones','litros de gasolina',
      'aceite','lubricante','llantas','taller','mecanico','lavadero','lavada',
      'parqueadero','parking','parquear','soat','tecnomecanica','seguro carro','seguro moto',
      // Pasajes con contexto
      'pasaje','tiquete','peaje','recarga','tarjeta tullave','mio card','civica',
      'pasaje de bus','pasaje de metro','pasaje de subida','pasaje de bajada',
      'pasaje subida','pasaje bajada','subida en bus','bajada en bus',
      'moto','bicicleta','cicla','patineta','scooter',
      // Equipamiento de moto y bici
      'casco','casco moto','casco bici','casco de moto','casco de bicicleta',
      'guantes moto','rodilleras','chaleco reflectivo','impermeable moto',
      'fui en taxi','tome uber','cogi bus','llene gasolina','pague parqueadero'
    ]
  },
  salud: {
    emoji: '🏥', nombre: 'Salud', tipo: 'egreso',
    palabras: [
      'medico','doctor','doctora','cita medica','consulta','especialista',
      'odontologo','dentista','ortodoncia','brackets','carillas',
      'optometra','optologo','gafas','lentes','anteojos',
      'psicologo','psiquiatra','terapia','terapeuta','nutricionista','fisioterapeuta','fisioterapia',
      'farmacia','drogueria','drogas la rebaja','colsubsidio drogueria','sanar',
      'clinica','hospital','eps','ips','urgencias','emergencia',
      'laboratorio','examen','analisis','radiografia','ecografia','endoscopia','cirugia',
      'medicina','medicamento','pastillas','ampolletas','jarabe','antibiotico',
      'vitaminas','suplemento','proteina','crema','pomada','gotas','inhalador',
      'fui al medico','fui al dentista','compre medicamento','saque cita'
    ]
  },
  aseo_personal: {
    emoji: '🧴', nombre: 'Aseo personal', tipo: 'egreso',
    palabras: [
      // Productos de higiene
      'jabon','jabon de baño','jabon liquido','gel de baño','shampoo','acondicionador',
      'pasta de dientes','cepillo de dientes','enjuague bucal','hilo dental','colgate',
      'desodorante','antitranspirante','talco','locion corporal','crema corporal',
      'papel higienico','toallas humedas','servilletas','pañitos','cotton','hisopos',
      'rasuradora','maquina de afeitar','crema de afeitar','after shave',
      'protector solar','bloqueador','pañales','toallas sanitarias','tampones',
      // Marcas comunes
      'dove','head shoulders','pantene','loreal cabello','garnier','nivea','johnson',
      'old spice','axe','gillette','venus','always','nosotras','stayfree',
      // Tiendas
      'drogueria aseo','tienda aseo','aseo personal',
      // Verbos
      'compre jabon','compre shampoo','compre desodorante','compre papel higienico'
    ]
  },
  aseo_hogar: {
    emoji: '🧹', nombre: 'Aseo hogar', tipo: 'egreso',
    palabras: [
      'detergente','lavaplatos','limpiapisos','desengrasante','cloro','blanqueador','desinfectante',
      'cif','ajax','fabuloso','poett','lysol','ariel','fab','ace','gain',
      'escoba','trapero','recogedor','balde','mopa','lampazo',
      'bolsas de basura','esponjas','estropajo','guantes de cocina','guantes limpieza',
      'ambientador','aromatizante','velas aromaticas',
      'compre detergente','compre limpiapisos','compre cloro','productos de aseo','productos de limpieza'
    ]
  },
  servicios_publicos: {
    emoji: '💡', nombre: 'Servicios públicos', tipo: 'egreso',
    palabras: [
      // No incluir 'agua' ni 'luz' solos — son ambiguos (bebida, fruta, claridad)
      // Solo frases que claramente se refieren al servicio
      'acueducto','alcantarillado',
      'energia electrica','recibo de energia',
      'gas natural','gas domiciliario',
      'epm','codensa','gases de occidente','naturgas','surtigas','triple a','emcali',
      'recibo de agua','recibo de luz','recibo de gas','servicio publico','factura servicio',
      'pague recibo','pague el agua','pague la luz','pague el gas','pague los servicios',
      'servicios publicos'
    ]
  },
  telecomunicaciones: {
    emoji: '📱', nombre: 'Telecomunicaciones', tipo: 'egreso',
    palabras: [
      'internet','wifi','plan de datos','datos','claro','movistar','tigo','wom','virgin mobile',
      'plan celular','plan movil','recargar','recarga celular','minutos',
      'cable','television','tv cable','directv','claro tv','movistar tv',
      'recargo celular','recargue','pague internet','pague el plan'
    ]
  },
  arriendo: {
    emoji: '🏠', nombre: 'Arriendo', tipo: 'egreso',
    palabras: [
      'arriendo','renta','alquiler','canon de arrendamiento','canon',
      'administracion','cuota de administracion','cuota admin',
      'pague arriendo','pague renta','pague la administracion'
    ]
  },
  entretenimiento: {
    emoji: '🎬', nombre: 'Entretenimiento', tipo: 'egreso',
    palabras: [
      'netflix','spotify','amazon prime','disney plus','disney+','hbo max','apple tv',
      'paramount','crunchyroll','youtube premium','tidal','deezer',
      'cine','cinemark','royal films','cine colombia','pelicula',
      'concierto','show','espectaculo','teatro','obra','musical','ballet',
      'bar','discoteca','rumba','fiesta','club','antro','taberna','cantina',
      'bolos','bowling','karting','escape room','parque de diversiones',
      'videojuego','steam','xbox','playstation','nintendo','switch','ps5','game pass',
      'karaoke','billar','tejo','rana','entrada partido','estadio'
    ]
  },
  educacion: {
    emoji: '📚', nombre: 'Educación', tipo: 'egreso',
    palabras: [
      'colegio','universidad','instituto','academia','escuela','jardin','preescolar',
      'uniandes','javeriana','nacional','sena','politecnico','compensar','cafam',
      'matricula','pension escolar','mensualidad colegio','tutoría','tutoria','clases particulares',
      'libro','libros','cuaderno','utiles','utiles escolares','mochila escolar','uniforme',
      'curso','capacitacion','seminario','diplomado','taller','conferencia',
      'udemy','coursera','platzi','domestika',
      'pague pension','pague matricula','compre libros','pague curso'
    ]
  },
  ropa: {
    emoji: '👕', nombre: 'Ropa y calzado', tipo: 'egreso',
    palabras: [
      'ropa','camisa','camiseta','blusa','pantalon','jean','jeans','short',
      'vestido','falda','medias','calcetines','ropa interior','boxer','brasier',
      'chaqueta','abrigo','saco','buzo','sudadera','hoodie','pijama',
      'tenis','zapatillas','zapatos','botas','sandalias','chanclas','tacones',
      'cinturon','bolso','cartera','gorra','sombrero',
      // NOTA: 'mango' eliminado — es fruta. Se mantiene 'tienda mango' para referirse a la marca
      'tienda mango','zara','bershka','pull and bear','stradivarius','forever 21',
      'adidas','nike','puma','reebok','new balance','vans','converse',
      'temu','shein','falabella ropa','gef','pronto','chevignon','totto','colore',
      'compre ropa','compre camiseta','compre zapatos','compre jean','compre tenis'
    ]
  },
  tecnologia: {
    emoji: '💻', nombre: 'Tecnología', tipo: 'egreso',
    palabras: [
      'celular','telefono','smartphone','iphone','android','samsung galaxy','huawei',
      'computador','laptop','portatil','macbook','tablet','ipad','kindle',
      'smartwatch','reloj inteligente','apple watch',
      'auriculares','audifonos','earbuds','airpods','parlante','bocina',
      'camara','gopro','dron',
      'cargador','cable usb','power bank','funda celular','case','protector pantalla',
      'mouse','teclado','monitor','disco duro','ssd','ram','memoria',
      'alkosto','ktronix','mac center',
      'compre celular','compre computador','repare celular'
    ]
  },
  hogar_muebles: {
    emoji: '🛋️', nombre: 'Hogar y muebles', tipo: 'egreso',
    palabras: [
      'mueble','sofa','cama','colchon','mesa','silla','escritorio','closet','armario',
      'cortinas','alfombra','lampara','cuadro','decoracion','adorno',
      'nevera','refrigerador','lavadora','secadora','estufa','horno','microondas',
      'licuadora','batidora','cafetera','tostadora','aspiradora','plancha','aire acondicionado',
      'plomero','plomeria','fontanero','electricista','albanil','pintura','ferreteria',
      'reparacion hogar','arreglo hogar','olla','sarten','vajilla','cubiertos',
      'homecenter','easy','muebles y muebles',
      'compre para la casa','arregle la casa','pague plomero'
    ]
  },
  belleza: {
    emoji: '💅', nombre: 'Belleza', tipo: 'egreso',
    palabras: [
      'peluqueria','barberia','salon de belleza','estetica','spa','centro estetico',
      'corte de cabello','corte','corte de pelo','me corte el pelo','me hice el corte','me hice el cabello',
      'tinte','coloracion','decoloracion','permanente',
      'manicure','pedicure','unas','acrilicas','gel unas','semipermanente','nail art',
      'depilacion','cera','laser','facial','limpieza facial','masaje','bronceado',
      'cejas','micropigmentacion','microblading','botox','relleno',
      'maquillaje','base maquillaje','labial','mascara','sombras','rubor',
      'perfume','fragancia','colonia',
      'loreal','mac','nyx','maybelline','revlon','sephora','cyzone','esika','yanbal',
      'fui a la peluqueria','me tine el cabello','me hice las unas','me corte el cabello'
    ]
  },
  mascotas: {
    emoji: '🐾', nombre: 'Mascotas', tipo: 'egreso',
    palabras: [
      'perro','gato','mascota','hamster','conejo','pajaro','loro','pez','acuario',
      'veterinario','veterinaria','vet','clinica veterinaria','consulta veterinaria',
      'vacuna perro','vacuna gato','desparasitacion','bano canino','peluqueria canina',
      'concentrado','alimento para mascota','croquetas','pedigree','royal canin',
      'collar','correa','cama mascota','juguete mascota','jaula','transportador','arena gato',
      'fui al veterinario','compre concentrado','bane al perro'
    ]
  },
  salario: {
    emoji: '💼', nombre: 'Salario', tipo: 'ingreso',
    palabras: [
      'salario','sueldo','nomina','quincena','jornal','honorarios','fee',
      'freelance','trabajo independiente','contrato','prestacion de servicios',
      'me pagaron','recibi pago','me depositaron','cobre mi sueldo','cobre mi salario',
      'me consignaron','llego mi sueldo','llego mi nomina','me pago el jefe','me pago el cliente',
      'cobre proyecto','cobre trabajo','arenera','constructora','fabrica',
      'pago de mi trabajo','pago del trabajo','me cancelaron',
      'prima','bonificacion','bono','comision','auxilio de transporte',
      'cesantias','vacaciones pagadas','liquidacion'
    ]
  },
  ventas: {
    emoji: '🛍️', nombre: 'Ventas', tipo: 'ingreso',
    palabras: [
      'venta','vendi','cobre venta','ingreso por venta',
      'negocio','emprendimiento','tienda propia','negocio propio',
      'mercancia','producto vendido','servicio cobrado',
      'cliente pago','cliente me pago','me pago un cliente',
      'factura cobrada','cobro de factura','rebusque'
    ]
  },
  transferencia: {
    emoji: '🔄', nombre: 'Transferencia', tipo: 'ingreso',
    palabras: [
      'nequi','daviplata','transfiya','a la mano','rappipay',
      'bancolombia','davivienda','bbva','banco de bogota','banco popular',
      'colpatria','scotiabank','citi','itau','ban100','lulo bank','nubank',
      'transferencia','transferi','transferencia bancaria','consignacion','deposito',
      'envie dinero','me enviaron','recibi transferencia','me mandaron','me giraron',
      'giro','remesa','remesa del exterior'
    ]
  },
  otros: {
    emoji: '📦', nombre: 'Otros', tipo: 'ambos',
    palabras: []
  }
};

// ── PARSER ────────────────────────────────────────────────────────────────────
const Parser = (() => {
  // Cache de categorías personalizadas (se recarga cuando cambian)
  let _catsPersonalizadas = [];
  let _catsPersonalizadasCargadas = false;

  async function cargarCatsPersonalizadas() {
    try {
      _catsPersonalizadas = await DB.obtenerCategorias();
      _catsPersonalizadasCargadas = true;
    } catch (e) {
      _catsPersonalizadas = [];
    }
  }

  function invalidarCache() {
    _catsPersonalizadasCargadas = false;
    _catsPersonalizadas = [];
  }

  // Normalizar texto: quitar tildes, ñ→n, minúsculas
  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Devuelve el mapa de categorías completo:
   * base + overrides de BD (si el usuario editó nombre/emoji de una base)
   * + categorías nuevas creadas por el usuario.
   * Para el categorizador: las palabras clave de las personalizadas también cuentan.
   */
  function getCategoriasMerged() {
    const merged = { ...CATEGORIAS };
    for (const cat of _catsPersonalizadas) {
      if (merged[cat.slug]) {
        // Override de emoji/nombre sobre categoría base
        merged[cat.slug] = {
          ...merged[cat.slug],
          emoji: cat.emoji,
          nombre: cat.nombre,
          // Fusionar palabras: base + las que el usuario agregó
          palabras: [...(merged[cat.slug].palabras || []), ...(cat.palabras || [])]
        };
      } else {
        // Categoría completamente nueva
        merged[cat.slug] = {
          emoji: cat.emoji,
          nombre: cat.nombre,
          tipo: cat.tipo || 'egreso',
          palabras: cat.palabras || [],
          esPersonalizada: true
        };
      }
    }
    return merged;
  }

  // Categorizar automáticamente por descripción
  function categorizarAuto(descripcion) {
    if (!descripcion) return 'otros';
    const desc = normalizar(descripcion);
    const cats = getCategoriasMerged();

    for (const [slug, data] of Object.entries(cats)) {
      if (slug === 'otros') continue;
      for (const palabra of (data.palabras || [])) {
        const pal = normalizar(palabra);
        // Para palabras muy cortas (≤ 3 caracteres) usar word boundary
        // para evitar falsos positivos (ej: "luz" en "luzca", "d1" exacto)
        // Para todo lo demás, includes es suficiente y más preciso
        if (pal.length <= 3) {
          if (new RegExp('(?:^|\\s|,)' + pal + '(?:\\s|,|$)', 'i').test(desc)) return slug;
        } else {
          if (desc.includes(pal)) return slug;
        }
      }
    }
    return 'otros';
  }

  // Limpiar y parsear monto desde string
  function parsearMonto(texto) {
    const limpio = texto.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(limpio);
    return isNaN(num) ? null : num;
  }

  // Formatear número como moneda colombiana
  // abreviar=true solo para dashboards/resúmenes; historial siempre usa false
  function formatCOP(num, abreviar = false) {
    if (num === null || num === undefined || isNaN(num)) return '$0';
    if (abreviar) {
      if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'k';
    }
    return '$' + Math.round(num).toLocaleString('es-CO');
  }

  // Rango de fechas para un período
  function getRangoFecha(periodo) {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth();
    const dia = hoy.getDay();
    const fechaHoy = hoy.toISOString().split('T')[0];
    switch (periodo) {
      case 'hoy': return { desde: fechaHoy, hasta: fechaHoy };
      case 'semana': {
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
        return { desde: lunes.toISOString().split('T')[0], hasta: fechaHoy };
      }
      case 'mes': return { desde: new Date(año, mes, 1).toISOString().split('T')[0], hasta: fechaHoy };
      case 'año': return { desde: new Date(año, 0, 1).toISOString().split('T')[0], hasta: fechaHoy };
      default: return { desde: null, hasta: null };
    }
  }

  function nombreMes(num) {
    return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][num] || '';
  }
  function nombreMesLargo(num) {
    return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][num] || '';
  }

  function fechaLegible(isoDate) {
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const [y, m, d] = isoDate.split('-').map(Number);
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const fecha = new Date(y, m - 1, d, 12, 0, 0);
    const diaCapital = dias[fecha.getDay()].charAt(0).toUpperCase() + dias[fecha.getDay()].slice(1);
    if (isoDate === hoy) return `Hoy, ${d} de ${meses[m - 1]}`;
    if (isoDate === ayer) return `Ayer, ${d} de ${meses[m - 1]}`;
    return `${diaCapital}, ${d} de ${meses[m - 1]} de ${y}`;
  }

  function fechaGrupo(isoDate) {
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const [y, m, d] = isoDate.split('-').map(Number);
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const fecha = new Date(y, m - 1, d, 12, 0, 0);
    const diaCapital = dias[fecha.getDay()].charAt(0).toUpperCase() + dias[fecha.getDay()].slice(1);
    const añoActual = new Date().getFullYear();
    if (isoDate === hoy) return `Hoy · ${diaCapital} ${d} de ${meses[m - 1]}`;
    if (isoDate === ayer) return `Ayer · ${diaCapital} ${d} de ${meses[m - 1]}`;
    if (y === añoActual) return `${diaCapital} ${d} de ${meses[m - 1]}`;
    return `${diaCapital} ${d} de ${meses[m - 1]} de ${y}`;
  }

  function diasEntre(fecha1, fecha2) {
    return Math.round((new Date(fecha2) - new Date(fecha1)) / (1000 * 60 * 60 * 24));
  }

  function calcularPrestamo(montoOriginal, interesMensual, numCuotas) {
    if (!interesMensual || interesMensual === 0) {
      return { cuotaMensual: numCuotas ? montoOriginal / numCuotas : null, totalPagar: montoOriginal, totalInteres: 0 };
    }
    const i = interesMensual / 100;
    if (numCuotas) {
      const cuota = montoOriginal * (i * Math.pow(1 + i, numCuotas)) / (Math.pow(1 + i, numCuotas) - 1);
      const totalPagar = cuota * numCuotas;
      return { cuotaMensual: cuota, totalPagar, totalInteres: totalPagar - montoOriginal };
    }
    return { cuotaMensual: null, totalPagar: null, totalInteres: null };
  }

  function proyectarMes(movimientos) {
    const hoy = new Date();
    const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const diaActual = hoy.getDate();
    const mesActual = hoy.toISOString().slice(0, 7);
    const movsDelMes = movimientos.filter(m => m.fecha.startsWith(mesActual));
    const ingresosMes = movsDelMes.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const egresosMes = movsDelMes.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
    const promedioEgresoDiario = diaActual > 0 ? egresosMes / diaActual : 0;
    const proyeccionEgresos = egresosMes + promedioEgresoDiario * (diasMes - diaActual);
    return {
      ingresosMes, egresosMes,
      saldoActual: ingresosMes - egresosMes,
      proyeccionEgresos,
      proyeccionSaldo: ingresosMes - proyeccionEgresos,
      diasRestantes: diasMes - diaActual,
      promedioEgresoDiario,
      porcentajeMes: Math.round((diaActual / diasMes) * 100)
    };
  }

  // Generar slug único desde un nombre
  function slugify(nombre) {
    return nombre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Detecta si una descripción corresponde a un lugar de compra mixta
  const LUGARES_MIXTOS = [
    'exito','carulla','jumbo','olimpica','metro','makro','surtifamiliar',
    'supermercado','mercado','plaza de mercado','galeria','tienda mixta',
    'd1','ara','justo y bueno','alkosto','homecenter','falabella'
  ];

  function esLugarMixto(descripcion) {
    const desc = normalizar(descripcion);
    return LUGARES_MIXTOS.some(lugar => desc.includes(normalizar(lugar)));
  }

  // ── ANÁLISIS DE MÚLTIPLES PRODUCTOS ──────────────────────────
  const _reSep = /\s*(?:,\s*|\s+y\s+|\s+e\s+|\s+mas\s+|\s+más\s+|\s+también\s+|\s+tambien\s+|\s+además\s+|\s+ademas\s+|\s*\+\s*|\s*;\s*)\s*/i;

  /**
   * Dado un texto, devuelve array de productos detectados.
   * { texto, sinCantidad, categoria, emoji, nombre }
   */
  function analizarProductos(descripcion) {
    if (!descripcion) return [];
    const cats = getCategoriasMerged();

    // Quitar verbo inicial y verbos intermedios de compra
    let textoLimpio = descripcion
      .replace(/^(compré?|gasté?|pagué?|compre en|fui a comprar|compramos|me hice|me hize|me corte|me corté)\s+/i, '')
      .replace(/\s+(y\s+)?(compré?|gasté?|pagué?|compré un|compré una|compre un|compre una)\s+/gi, ' y ')
      .trim();

    // Dividir por separadores
    const partesRaw = textoLimpio.split(_reSep).map(p => p.trim()).filter(Boolean);

    // POST-PROCESO: fusionar fragmentos "huérfanos"
    // Un fragmento es huérfano si tiene < 2 palabras Y no tiene ninguna palabra clave propia
    const partes = [];
    for (let i = 0; i < partesRaw.length; i++) {
      const parte = partesRaw[i];
      const palabras = parte.split(/\s+/).length;
      const sinCant = parte.replace(/^\d+\s+/, '').replace(/^(un|una|unos|unas|el|la|los|las)\s+/i, '').trim();
      const catParte = categorizarAuto(sinCant);

      // Si el fragmento es muy corto (1 palabra) y no detectó categoría propia,
      // lo fusionamos con el fragmento anterior
      if (palabras === 1 && catParte === 'otros' && partes.length > 0) {
        partes[partes.length - 1] += ' y ' + parte;
      } else {
        partes.push(parte);
      }
    }

    // Construir resultado final
    return partes.map(parte => {
      const sinCantidad = parte
        .replace(/^\d+\s+/, '')
        .replace(/^(un|una|unos|unas|el|la|los|las)\s+/i, '')
        .trim();

      const cat = categorizarAuto(sinCantidad) !== 'otros'
        ? categorizarAuto(sinCantidad)
        : categorizarAuto(parte);

      const info = cats[cat] || cats.otros;
      return { texto: parte, sinCantidad, categoria: cat, emoji: info.emoji, nombre: info.nombre };
    });
  }

  /**
   * True si hay múltiples productos de categorías distintas.
   */
  function esCompraMultiple(descripcion) {
    if (!descripcion || descripcion.trim().split(/\s+/).length < 3) return false;
    const productos = analizarProductos(descripcion);
    if (productos.length <= 1) return false;
    const categoriasUnicas = new Set(productos.map(p => p.categoria));
    return categoriasUnicas.size > 1;
  }

  return {
    cargarCatsPersonalizadas, invalidarCache, getCategoriasMerged,
    parsearMonto, formatCOP, normalizar, categorizarAuto,
    esLugarMixto, analizarProductos, esCompraMultiple,
    getRangoFecha, nombreMes, nombreMesLargo, fechaLegible, fechaGrupo,
    diasEntre, calcularPrestamo, proyectarMes, slugify,
    CATEGORIAS, LUGARES_MIXTOS
  };
})();
