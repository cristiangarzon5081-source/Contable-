/**
 * CONTABLE - Parser de lenguaje natural + Categorizador inteligente
 */

const CATEGORIAS = {
  alimentacion: {
    emoji: '🍽️',
    palabras: [
      // Comidas genéricas
      'almuerzo','comida','restaurante','desayuno','cena','merienda','onces','tinto','cafe','cafeteria',
      'pizza','hamburguesa','hamburgesa','hotdog','perro','pollo','arroz','pasta','sopa','sancocho',
      'bandeja','arepas','empanadas','tamales','patacon','mondongo','changua','caldo','frijoles',
      // Frutas y verduras
      'frutas','verduras','legumbres','hortalizas','ensalada',
      // Supermercados y tiendas
      'mercado','supermercado','tienda','minimercado','galeria','plaza de mercado','exito','carulla',
      'jumbo','olimpica','d1','ara','justo y bueno','metro','makro','surtifamiliar',
      // Domicilios y delivery
      'rappi','domicilio','pedido','ifood','uber eats','dominos','pizza hut',
      // Snacks y bebidas
      'snack','dulces','chocolate','galletas','jugos','bebidas','gaseosa','agua','cerveza','aguardiente',
      'ron','vino','licor','trago','helado','postres','panaderia','pan','tostadas','croissant',
      // Restaurantes de cadena
      'mcdonalds','burger king','kentucky','kfc','subway','crepes','wok','frisby','presto',
      'el corral','popsy','panda express','sushi','tacos','burritos','mexcal','taquerıa',
      // Verbos comunes
      'comi','desayune','almhorce','cene','tome','bebi','compre comida','gaste en comida',
      'pedi domicilio','pedı domicilio','lunch','brunch'
    ]
  },
  transporte: {
    emoji: '🚗',
    palabras: [
      // Servicios de transporte
      'taxi','uber','didi','beat','indriver','cabify','picap','liftit','rappi moto',
      'bus','buseta','colectivo','sitp','metro','transmilenio','mio','metroplus','metro de medellin',
      'metro cable','teleférico','tren','tren de la sabana',
      // Combustible y vehículo
      'gasolina','combustible','diesel','acpm','full','galones','litros de gasolina',
      'aceite','lubricante','llantas','neumaticos','taller','mecanico','lavadero','lavada',
      'parqueadero','parking','parquear','soat','tecnomecanica','seguro carro','seguro moto',
      // Pasajes y peajes
      'pasaje','tiquete','peaje','recarga','tarjeta tullave','mio card','civica',
      // Moto y bicicleta
      'moto','motos','bicicleta','cicla','patineta','scooter',
      // Verbos
      'fui en taxi','tome uber','cogi bus','llene gasolina','pague parqueadero'
    ]
  },
  salud: {
    emoji: '🏥',
    palabras: [
      // Profesionales
      'medico','doctor','doctora','medica','cita medica','consulta','especialista',
      'odontologo','dentista','odontologa','ortodoncia','brackets','carillas',
      'optometra','optologo','gafas','lentes','anteojos','visita medica',
      'psicologo','psiquiatra','terapia','terapeuta','nutricionista','nutriologo',
      'fisioterapeuta','fisioterapia','rehabilitacion',
      // Establecimientos
      'farmacia','drogueria','drogas la rebaja','colsubsidio drogueria','sanar','la economia',
      'clinica','hospital','eps','ips','urgencias','emergencia','sala de espera',
      'laboratorio','examen','analisis','radiografia','ecografia','endoscopia',
      'cirugia','operacion','procedimiento',
      // Medicamentos
      'medicina','medicamento','pastillas','ampolletas','jarabe','antibiotico',
      'vitaminas','suplemento','proteina','crema','pomada','gotas','inhalador',
      // Verbos
      'fui al medico','fui al dentista','compre medicamento','saque cita','pague eps'
    ]
  },
  entretenimiento: {
    emoji: '🎬',
    palabras: [
      // Streaming
      'netflix','spotify','amazon prime','disney plus','disney+','hbo','hbo max','max',
      'apple tv','paramount','crunchyroll','youtube premium','tidal','deezer',
      // Cine y espectáculos
      'cine','cinemark','cinemagic','royal films','cine colombia','pelicula','funcion',
      'concierto','show','espectaculo','teatro','obra','musical','ballet',
      // Salidas
      'bar','discoteca','rumba','fiesta','club','antro','taberna','cantina',
      'bolos','bowling','karting','kartodromo','escape room','laser tag',
      'parque','parque de diversiones','salitre magico','mundo aventura',
      // Videojuegos
      'videojuego','juego','steam','xbox','playstation','nintendo','switch','ps5','ps4',
      'game pass','psn','playstation store','app store','google play',
      // Deportes como espectador
      'entrada partido','tiquete partido','estadio','palco',
      // Otros
      'evento','concierto','festival','feria','exposicion',
      'karaoke','billar','tejo','rana'
    ]
  },
  servicios: {
    emoji: '💡',
    palabras: [
      // Servicios públicos
      'agua','luz','energia','gas natural','gas domiciliario','acueducto','alcantarillado',
      'epm','codensa','gases de occidente','naturgas','surtigas','triple a','emcali',
      'recibo','factura','servicio publico',
      // Telecomunicaciones
      'internet','wifi','plan de datos','datos','claro','movistar','tigo','wom','virgin mobile',
      'plan celular','plan movil','recargar','recarga celular','minutos',
      'cable','television','tv cable','directv','claro tv','movistar tv',
      // Vivienda
      'arriendo','renta','alquiler','canon','administracion','cuota de administracion',
      // Seguros y financieros
      'seguro','poliza','prima','seguro de vida','seguro hogar',
      // Suscripciones y otros
      'suscripcion','mensualidad','membresia','cuota mensual',
      // Verbos
      'pague arriendo','pague servicios','pague el recibo','recargue el celular'
    ]
  },
  educacion: {
    emoji: '📚',
    palabras: [
      // Establecimientos
      'colegio','universidad','instituto','academıa','escuela','jardin','preescolar',
      'uniandes','javeriana','nacional','sena','politecnico','compensar','cafam',
      // Pagos educativos
      'matricula','pension','mensualidad colegio','cuota educacion','pension escolar',
      'tutoría','tutoria','clases particulares','refuerzo',
      // Material
      'libro','libros','cuaderno','lapices','utiles','utiles escolares','mochila',
      'uniform','uniforme','ropa escolar','zapatos colegiales',
      // Cursos y capacitación
      'curso','capacitacion','seminario','diplomado','taller','conferencia',
      'udemy','coursera','platzi','domestika','linkedin learning',
      // Verbos
      'pague pension','pague matricula','compre libros','pague curso'
    ]
  },
  ropa: {
    emoji: '👕',
    palabras: [
      // Prendas
      'ropa','camisa','camiseta','blusa','camiseta','pantalon','jean','jeans','short',
      'vestido','falda','medias','calcetines','ropa interior','boxer','brasier','tanga',
      'chaqueta','abrigo','saco','buzo','sudadera','hoodie','pijama','bata',
      'tenis','zapatillas','zapatos','botas','sandalias','chanclas','tacones',
      'cinturon','bolso','cartera','mochila de moda','gorra','sombrero',
      // Tiendas y marcas
      'zara','h&m','bershka','pull and bear','stradivarius','mango','forever 21',
      'adidas','nike','puma','reebok','new balance','vans','converse',
      'temu','shein','amazon ropa','falabella','ripley','alkosto ropa',
      'gef','pronto','naf naf','chevignon','totto','colore','venus','patprimo',
      // Verbos
      'compre ropa','compre camiseta','compre zapatos','compre jean','compre tenis'
    ]
  },
  tecnologia: {
    emoji: '💻',
    palabras: [
      // Dispositivos
      'celular','telefono','smartphone','iphone','android','samsung galaxy','huawei',
      'computador','computadora','laptop','portatil','macbook','imac','mac mini',
      'tablet','ipad','kindle','e-reader',
      'smartwatch','reloj inteligente','apple watch','galaxy watch',
      'auriculares','audifonos','earbuds','airpods','buds',
      'parlante','bocina','altavoz','sonos','jbl','bose',
      'camara','gopro','dron','drone',
      // Accesorios y repuestos
      'cargador','cable usb','cable tipo c','power bank','bateria portatil',
      'funda','case','protector pantalla','vidrio templado',
      'mouse','teclado','monitor','pantalla','disco duro','ssd','ram','memoria',
      // Tiendas y marcas
      'apple','samsung','huawei','xiaomi','oppo','motorola','lg','sony',
      'alkosto','ktronix','mac center','iShop','claro tienda',
      // Verbos
      'compre celular','compre computador','compre auriculares','repare celular'
    ]
  },
  hogar: {
    emoji: '🏠',
    palabras: [
      // Muebles y decoración
      'mueble','sofa','cama','colchon','mesa','silla','escritorio','closet','armario',
      'cortinas','alfombra','lampara','cuadro','decoracion','adorno',
      // Electrodomésticos
      'nevera','refrigerador','lavadora','secadora','estufa','horno','microondas',
      'licuadora','batidora','cafetera','tostadora','aspiradora','plancha',
      'aire acondicionado','ventilador','calentador',
      // Reparación y mantenimiento
      'plomero','plomeria','fontanero','fontaneria','electricista','albanil',
      'pintura','pintar','pinturas','cemento','materiales','ferreteria',
      'reparacion','arreglo','mantenimiento','instalacion',
      // Limpieza
      'jabón','detergente','limpieza','escoba','trapero','bolsas de basura',
      'papel higienico','toallas','servilletas','desinfectante',
      // Cocina y menaje
      'olla','sarten','vajilla','cubiertos','vasos','copas',
      // Tiendas
      'homecenter','easy','muebles y muebles','falabella hogar','alkosto hogar',
      // Verbos
      'compre para la casa','arregle la casa','pague plomero','compre mueble'
    ]
  },
  mascotas: {
    emoji: '🐾',
    palabras: [
      'perro','gato','mascota','hamster','conejo','pajaro','loro','pez','acuario',
      'veterinario','veterinaria','vet','clinica veterinaria','consulta veterinaria',
      'vacuna perro','vacuna gato','desparasitacion','bano canino','peluqueria canina',
      'concentrado','alimento para mascota','croquetas','pedigree','royal canin',
      'collar','correa','cama mascota','juguete mascota','jaula','transportador',
      'arena gato','bandeja sanitaria',
      // Verbos
      'fui al veterinario','compre concentrado','bane al perro','vacune al gato'
    ]
  },
  belleza: {
    emoji: '💅',
    palabras: [
      // Establecimientos
      'peluqueria','barberia','salon de belleza','estetica','spa','centro estetico',
      // Servicios
      'corte de cabello','corte','tinte','coloracion','decoloracion','permanente',
      'manicure','pedicure','unas','acrilicas','gel','semipermanente','nail art',
      'depilacion','cera','laser','facial','limpieza facial','masaje','bronceado',
      'cejas','micropigmentacion','microblading','botox','relleno',
      // Productos
      'maquillaje','base','labial','mascara','sombras','rubor','iluminador',
      'shampoo','acondicionador','tinte de cabello','serum','crema',
      'perfume','fragancia','colonia',
      // Marcas
      'loreal','mac','nyx','maybelline','revlon','sephora','cyzone','esika','yanbal',
      // Verbos
      'fui a la peluqueria','me tine el cabello','me hice las unas','me corte el cabello'
    ]
  },
  salario: {
    emoji: '💼',
    palabras: [
      // Tipos de ingreso laboral
      'salario','sueldo','nomina','quincena','quincena de trabajo','pago mensual',
      'jornal','honorarios','fee','pago de honorarios',
      'freelance','trabajo independiente','contrato','prestacion de servicios',
      // Verbos de cobro
      'me pagaron','recibi pago','me depositaron','cobre mi sueldo','cobre mi salario',
      'me consignaron','llego mi sueldo','llego mi nomina','me pago el jefe',
      'me pago el cliente','cobre proyecto','cobre trabajo',
      // Contextos laborales
      'trabajo','empleo','empresa','jefe','patron','empleador','cliente de trabajo',
      'arenera','constructora','fabrica','oficina','taller de trabajo',
      'pago de mi trabajo','pago del trabajo','me cancelaron','me liquidaron',
      // Prima y bonificaciones
      'prima','bonificacion','bono','comision','pago comision','auxilio de transporte',
      'cesantias','intereses cesantias','vacaciones pagadas','liquidacion'
    ]
  },
  ventas: {
    emoji: '🛍️',
    palabras: [
      'venta','vendi','vendi un','cobre venta','ingreso por venta',
      'negocio','emprendimiento','tienda propia','negocio propio',
      'mercancia','producto vendido','servicio cobrado',
      'cliente pago','cliente me pago','me pago un cliente',
      'factura cobrada','cobro de factura',
      'rebusque','rebusqué','informal','dia a dia'
    ]
  },
  transferencia: {
    emoji: '🔄',
    palabras: [
      // Apps de pago
      'nequi','daviplata','transfiya','a la mano','rappipay',
      // Bancos
      'bancolombia','davivienda','bbva','banco de bogota','banco popular',
      'colpatria','scotiabank','citi','itau','ban100','lulo bank','nubank',
      // Acciones
      'transferencia','transferi','transferencia bancaria','consignacion','deposito',
      'envie dinero','me enviaron','recibí transferencia','recibi transferencia',
      'me mandaron','me giraron','giro','remesa','remesa del exterior'
    ]
  },
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

  // Normalizar texto: quitar tildes, ñ → n, minúsculas
  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar tildes
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9\s]/g, ' ')   // quitar caracteres especiales
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Categorizar automáticamente por descripción — sin necesidad de elegir categoría
  function categorizarAuto(descripcion) {
    if (!descripcion) return 'otros';
    const desc = normalizar(descripcion);

    // Buscar coincidencia por palabra clave (prioridad: primero que coincida gana)
    for (const [cat, data] of Object.entries(CATEGORIAS)) {
      if (cat === 'otros') continue;
      for (const palabra of data.palabras) {
        const pal = normalizar(palabra);
        // Coincidencia de subcadena completa (evita falsos positivos en palabras cortas)
        if (pal.length <= 3) {
          // Para palabras muy cortas, exigir que sea una palabra completa
          const regex = new RegExp(`\\b${pal}\\b`);
          if (regex.test(desc)) return cat;
        } else {
          if (desc.includes(pal)) return cat;
        }
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

  // Formatear fecha legible con día de semana
  function fechaLegible(isoDate) {
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const [y, m, d] = isoDate.split('-').map(Number);
    const nombreMeses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const diasSemana = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    // Usar mediodía para evitar problema de zona horaria
    const fecha = new Date(y, m - 1, d, 12, 0, 0);
    const diaSemana = diasSemana[fecha.getDay()];
    const diaSemanaCorto = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    if (isoDate === hoy) return `Hoy, ${d} de ${nombreMeses[m - 1]}`;
    if (isoDate === ayer) return `Ayer, ${d} de ${nombreMeses[m - 1]}`;
    return `${diaSemanaCorto}, ${d} de ${nombreMeses[m - 1]} de ${y}`;
  }

  // Fecha corta para encabezados de grupo (sin año si es el año actual)
  function fechaGrupo(isoDate) {
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const [y, m, d] = isoDate.split('-').map(Number);
    const nombreMeses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const diasSemana = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const fecha = new Date(y, m - 1, d, 12, 0, 0);
    const diaSemana = diasSemana[fecha.getDay()];
    const diaCapital = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    const añoActual = new Date().getFullYear();

    if (isoDate === hoy) return `Hoy · ${diaCapital} ${d} de ${nombreMeses[m - 1]}`;
    if (isoDate === ayer) return `Ayer · ${diaCapital} ${d} de ${nombreMeses[m - 1]}`;
    if (y === añoActual) return `${diaCapital} ${d} de ${nombreMeses[m - 1]}`;
    return `${diaCapital} ${d} de ${nombreMeses[m - 1]} de ${y}`;
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
    parsearMonto, formatCOP, normalizar, categorizarAuto, parsearTextoLibre,
    getRangoFecha, nombreMes, nombreMesLargo, fechaLegible, fechaGrupo, diasEntre,
    calcularPrestamo, proyectarMes, CATEGORIAS
  };
})();
