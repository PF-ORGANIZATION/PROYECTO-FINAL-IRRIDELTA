begin;

with cap_1 as (
  insert into public.capacitaciones (titulo, descripcion, publicada)
  values (
    'Fundamentos del Riego por Aspersion',
    'Recorrido inicial por los conceptos esenciales del riego por aspersion, su objetivo, la relacion entre agua, planta y cesped, y los criterios basicos para evaluar un sistema.',
    true
  )
  returning id
),
mod_1_1 as (
  insert into public.capacitacion_modulos (
    capacitacion_id, titulo, descripcion, orden, preguntas,
    porcentaje_aprobacion, duracion_maxima_minutos, cantidad_preguntas_a_mostrar
  )
  select
    id,
    'Definicion, objetivos y aplicaciones',
    'Introduccion a que es el riego por aspersion, para que se utiliza y en que contextos se aplica con mejores resultados.',
    1,
    '[
      {"id":"fda-m1-q1","tipo":"multiple_choice","enunciado":"Cual es uno de los objetivos principales del riego por aspersion?","opciones":["Aumentar el consumo de agua","Distribuir agua de manera uniforme","Reducir la presion del sistema","Eliminar la necesidad de mantenimiento"],"respuesta_correcta":1},
      {"id":"fda-m1-q2","tipo":"true_false","enunciado":"El riego por aspersion puede aplicarse tanto en jardines residenciales como en grandes areas verdes.","opciones":["Verdadero","Falso"],"respuesta_correcta":0}
    ]'::jsonb,
    70, 20, 2
  from cap_1
  returning id
),
res_1_1 as (
  insert into public.modulo_recursos (modulo_id, tipo, titulo, orden, youtube_url)
  select id, 'youtube', 'Introduccion al riego por aspersion', 1, 'https://www.youtube.com/watch?v=irri-demo-101' from mod_1_1
  union all
  select id, 'youtube', 'Objetivos del sistema de riego', 2, 'https://www.youtube.com/watch?v=irri-demo-102' from mod_1_1
),
mod_1_2 as (
  insert into public.capacitacion_modulos (
    capacitacion_id, titulo, descripcion, orden, preguntas,
    porcentaje_aprobacion, duracion_maxima_minutos, cantidad_preguntas_a_mostrar
  )
  select
    id,
    'El agua, la planta y la lamina de riego',
    'Relaciones entre disponibilidad de agua, absorcion por parte de la planta y necesidades del cesped segun su desarrollo.',
    2,
    '[
      {"id":"fda-m2-q1","tipo":"multiple_choice","enunciado":"Que representa la lamina de agua en riego?","opciones":["La profundidad de agua aplicada sobre una superficie","La presion de ingreso al sistema","La velocidad del viento","La temperatura del terreno"],"respuesta_correcta":0},
      {"id":"fda-m2-q2","tipo":"true_false","enunciado":"La necesidad de agua del cesped puede variar segun clima, suelo y etapa de crecimiento.","opciones":["Verdadero","Falso"],"respuesta_correcta":0}
    ]'::jsonb,
    70, 20, 2
  from cap_1
  returning id
),
res_1_2 as (
  insert into public.modulo_recursos (modulo_id, tipo, titulo, orden, youtube_url)
  select id, 'youtube', 'Agua y planta en el sistema', 1, 'https://www.youtube.com/watch?v=irri-demo-103' from mod_1_2
),
mod_1_3 as (
  insert into public.capacitacion_modulos (
    capacitacion_id, titulo, descripcion, orden, preguntas,
    porcentaje_aprobacion, duracion_maxima_minutos, cantidad_preguntas_a_mostrar
  )
  select
    id,
    'Calidad del riego y pluviometria',
    'Conceptos de uniformidad de aplicacion, cobertura y medicion de la cantidad de agua aportada por el sistema.',
    3,
    '[
      {"id":"fda-m3-q1","tipo":"multiple_choice","enunciado":"La pluviometria permite conocer principalmente:","opciones":["La cantidad de agua aplicada en un tiempo dado","El diametro de la tuberia","La calidad electrica de la bomba","La edad del cesped"],"respuesta_correcta":0},
      {"id":"fda-m3-q2","tipo":"true_false","enunciado":"Una mala uniformidad de riego puede generar sectores secos y otros con exceso de agua.","opciones":["Verdadero","Falso"],"respuesta_correcta":0}
    ]'::jsonb,
    70, 20, 2
  from cap_1
  returning id
),
res_1_3 as (
  insert into public.modulo_recursos (modulo_id, tipo, titulo, orden, youtube_url)
  select id, 'youtube', 'Uniformidad y pluviometria', 1, 'https://www.youtube.com/watch?v=irri-demo-104' from mod_1_3
)
insert into public.certificaciones (
  capacitacion_id, titulo, descripcion, preguntas, porcentaje_aprobacion, duracion_maxima_minutos
)
select
  id,
  'Evaluacion final - Fundamentos del Riego por Aspersion',
  'Instancia integradora sobre conceptos generales, necesidades de agua y calidad de aplicacion.',
  '[
    {"id":"fda-final-q1","tipo":"multiple_choice","enunciado":"Que factor se busca optimizar al evaluar la calidad del riego?","opciones":["Uniformidad de distribucion","Cantidad de electrovalvulas","Color del aspersor","Longitud del cableado"],"respuesta_correcta":0},
    {"id":"fda-final-q2","tipo":"multiple_choice","enunciado":"La lamina de agua se relaciona con:","opciones":["La profundidad aplicada sobre el area","La cantidad de codos instalados","La rugosidad externa del tubo","La potencia luminica del jardin"],"respuesta_correcta":0},
    {"id":"fda-final-q3","tipo":"true_false","enunciado":"Las aplicaciones del riego por aspersion se limitan unicamente a canchas profesionales.","opciones":["Verdadero","Falso"],"respuesta_correcta":1},
    {"id":"fda-final-q4","tipo":"true_false","enunciado":"La planta y el suelo influyen en la necesidad real de agua.","opciones":["Verdadero","Falso"],"respuesta_correcta":0}
  ]'::jsonb,
  70, 30
from cap_1;

with cap_2 as (
  insert into public.capacitaciones (titulo, descripcion, publicada)
  values (
    'Hidraulica Basica para Sistemas de Riego',
    'Capacitacion enfocada en presion, caudal y perdidas por friccion para entender el comportamiento hidraulico de una instalacion.',
    true
  )
  returning id
),
mod_2_1 as (
  insert into public.capacitacion_modulos (
    capacitacion_id, titulo, descripcion, orden, preguntas,
    porcentaje_aprobacion, duracion_maxima_minutos, cantidad_preguntas_a_mostrar
  )
  select
    id,
    'Presion estatica y dinamica',
    'Diferencias entre ambos conceptos y su impacto sobre el funcionamiento real del sistema cuando entra en operacion.',
    1,
    '[
      {"id":"hbsr-m1-q1","tipo":"multiple_choice","enunciado":"La presion dinamica se mide normalmente:","opciones":["Con el sistema en funcionamiento","Solo con las valvulas cerradas","Sin agua en la cañeria","A temperatura ambiente constante"],"respuesta_correcta":0},
      {"id":"hbsr-m1-q2","tipo":"true_false","enunciado":"La presion estatica y la dinamica suelen tener exactamente el mismo valor en operacion.","opciones":["Verdadero","Falso"],"respuesta_correcta":1}
    ]'::jsonb,
    70, 20, 2
  from cap_2
  returning id
),
res_2_1 as (
  insert into public.modulo_recursos (modulo_id, tipo, titulo, orden, youtube_url)
  select id, 'youtube', 'Presion estatica y dinamica', 1, 'https://www.youtube.com/watch?v=irri-demo-201' from mod_2_1
),
mod_2_2 as (
  insert into public.capacitacion_modulos (
    capacitacion_id, titulo, descripcion, orden, preguntas,
    porcentaje_aprobacion, duracion_maxima_minutos, cantidad_preguntas_a_mostrar
  )
  select
    id,
    'Caudal y perdidas por friccion',
    'Analisis del caudal disponible y de como la longitud, el diametro y la rugosidad afectan el rendimiento.',
    2,
    '[
      {"id":"hbsr-m2-q1","tipo":"multiple_choice","enunciado":"Que suele ocurrir si aumenta la longitud de la cañeria?","opciones":["Aumentan las perdidas por friccion","Disminuye automaticamente el consumo","Sube la pluviometria","Desaparece el golpe de ariete"],"respuesta_correcta":0},
      {"id":"hbsr-m2-q2","tipo":"true_false","enunciado":"El diametro interior de la tuberia influye en las perdidas por friccion.","opciones":["Verdadero","Falso"],"respuesta_correcta":0}
    ]'::jsonb,
    70, 20, 2
  from cap_2
  returning id
),
res_2_2 as (
  insert into public.modulo_recursos (modulo_id, tipo, titulo, orden, youtube_url)
  select id, 'youtube', 'Caudal y perdidas por friccion', 1, 'https://www.youtube.com/watch?v=irri-demo-202' from mod_2_2
  union all
  select id, 'youtube', 'Diametro y rugosidad', 2, 'https://www.youtube.com/watch?v=irri-demo-203' from mod_2_2
),
mod_2_3 as (
  insert into public.capacitacion_modulos (
    capacitacion_id, titulo, descripcion, orden, preguntas,
    porcentaje_aprobacion, duracion_maxima_minutos, cantidad_preguntas_a_mostrar
  )
  select
    id,
    'Golpe de ariete y generacion de presion',
    'Riesgos operativos asociados a cierres bruscos y nociones basicas sobre como se genera la presion en el sistema.',
    3,
    '[
      {"id":"hbsr-m3-q1","tipo":"multiple_choice","enunciado":"El golpe de ariete se asocia generalmente con:","opciones":["Cambios bruscos en la velocidad del agua","Falta de fertilizante","Cesped demasiado corto","Temperatura del controlador"],"respuesta_correcta":0},
      {"id":"hbsr-m3-q2","tipo":"true_false","enunciado":"Una mala gestion de la presion puede afectar la vida util del sistema.","opciones":["Verdadero","Falso"],"respuesta_correcta":0}
    ]'::jsonb,
    70, 20, 2
  from cap_2
  returning id
),
res_2_3 as (
  insert into public.modulo_recursos (modulo_id, tipo, titulo, orden, youtube_url)
  select id, 'youtube', 'Golpe de ariete y seguridad hidraulica', 1, 'https://www.youtube.com/watch?v=irri-demo-204' from mod_2_3
)
insert into public.certificaciones (
  capacitacion_id, titulo, descripcion, preguntas, porcentaje_aprobacion, duracion_maxima_minutos
)
select
  id,
  'Evaluacion final - Hidraulica Basica para Sistemas de Riego',
  'Evaluacion integral sobre presion, caudal y factores que modifican el comportamiento hidraulico.',
  '[
    {"id":"hbsr-final-q1","tipo":"multiple_choice","enunciado":"Que variable describe el volumen de agua que circula por unidad de tiempo?","opciones":["Caudal","Rugosidad","Lamina","Pendiente"],"respuesta_correcta":0},
    {"id":"hbsr-final-q2","tipo":"multiple_choice","enunciado":"Que condicion ayuda a reducir perdidas por friccion en un tramo?","opciones":["Mayor diametro interior","Menor presion disponible","Mas accesorios en linea","Mas cambios bruscos de direccion"],"respuesta_correcta":0},
    {"id":"hbsr-final-q3","tipo":"true_false","enunciado":"La presion dinamica se analiza con el sistema en uso.","opciones":["Verdadero","Falso"],"respuesta_correcta":0},
    {"id":"hbsr-final-q4","tipo":"true_false","enunciado":"El golpe de ariete no tiene relacion con maniobras de apertura o cierre.","opciones":["Verdadero","Falso"],"respuesta_correcta":1}
  ]'::jsonb,
  70, 30
from cap_2;

with cap_3 as (
  insert into public.capacitaciones (titulo, descripcion, publicada)
  values (
    'Eficiencia y Diseno Basico del Sistema',
    'Cierre practico orientado a criterios de eficiencia, sectorizacion, velocidad del agua y variables de diseño que impactan el resultado final.',
    true
  )
  returning id
),
mod_3_1 as (
  insert into public.capacitacion_modulos (
    capacitacion_id, titulo, descripcion, orden, preguntas,
    porcentaje_aprobacion, duracion_maxima_minutos, cantidad_preguntas_a_mostrar
  )
  select
    id,
    'Necesidad de agua y eficiencia del sistema',
    'Revision de los factores que afectan la eficiencia y de como adaptar la aplicacion a la demanda real del cesped.',
    1,
    '[
      {"id":"edbs-m1-q1","tipo":"multiple_choice","enunciado":"La eficiencia del sistema mejora cuando:","opciones":["La aplicacion se ajusta a la necesidad real del area","Se riega siempre mas tiempo del necesario","Se ignora el clima","Se eliminan todas las mediciones"],"respuesta_correcta":0},
      {"id":"edbs-m1-q2","tipo":"true_false","enunciado":"Aplicar mas agua de la necesaria siempre mejora la calidad del riego.","opciones":["Verdadero","Falso"],"respuesta_correcta":1}
    ]'::jsonb,
    70, 20, 2
  from cap_3
  returning id
),
res_3_1 as (
  insert into public.modulo_recursos (modulo_id, tipo, titulo, orden, youtube_url)
  select id, 'youtube', 'Eficiencia y necesidad de agua', 1, 'https://www.youtube.com/watch?v=irri-demo-301' from mod_3_1
),
mod_3_2 as (
  insert into public.capacitacion_modulos (
    capacitacion_id, titulo, descripcion, orden, preguntas,
    porcentaje_aprobacion, duracion_maxima_minutos, cantidad_preguntas_a_mostrar
  )
  select
    id,
    'Velocidad, diametro y longitud de cañerias',
    'Relaciones simples entre variables fisicas del sistema y su impacto en estabilidad, rendimiento y perdidas.',
    2,
    '[
      {"id":"edbs-m2-q1","tipo":"multiple_choice","enunciado":"Que variable del diseño influye directamente en la velocidad del agua?","opciones":["El diametro interior","El color del aspersor","La altura del cesped","La marca del controlador"],"respuesta_correcta":0},
      {"id":"edbs-m2-q2","tipo":"true_false","enunciado":"La longitud de las cañerias puede impactar la performance del sistema.","opciones":["Verdadero","Falso"],"respuesta_correcta":0}
    ]'::jsonb,
    70, 20, 2
  from cap_3
  returning id
),
res_3_2 as (
  insert into public.modulo_recursos (modulo_id, tipo, titulo, orden, youtube_url)
  select id, 'youtube', 'Velocidad y diametro', 1, 'https://www.youtube.com/watch?v=irri-demo-302' from mod_3_2
  union all
  select id, 'youtube', 'Longitud y comportamiento hidraulico', 2, 'https://www.youtube.com/watch?v=irri-demo-303' from mod_3_2
),
mod_3_3 as (
  insert into public.capacitacion_modulos (
    capacitacion_id, titulo, descripcion, orden, preguntas,
    porcentaje_aprobacion, duracion_maxima_minutos, cantidad_preguntas_a_mostrar
  )
  select
    id,
    'Buenas practicas de sectorizacion',
    'Criterios iniciales para agrupar areas de riego, ordenar consumos y lograr un funcionamiento equilibrado.',
    3,
    '[
      {"id":"edbs-m3-q1","tipo":"multiple_choice","enunciado":"Una buena sectorizacion busca principalmente:","opciones":["Compatibilizar demanda y capacidad hidraulica","Aumentar la cantidad de piezas sin criterio","Usar un unico sector para todo","Reducir la necesidad de mantenimiento a cero"],"respuesta_correcta":0},
      {"id":"edbs-m3-q2","tipo":"true_false","enunciado":"Separar sectores puede ayudar a controlar mejor caudal y presion.","opciones":["Verdadero","Falso"],"respuesta_correcta":0}
    ]'::jsonb,
    70, 20, 2
  from cap_3
  returning id
),
res_3_3 as (
  insert into public.modulo_recursos (modulo_id, tipo, titulo, orden, youtube_url)
  select id, 'youtube', 'Sectorizacion del sistema', 1, 'https://www.youtube.com/watch?v=irri-demo-304' from mod_3_3
)
insert into public.certificaciones (
  capacitacion_id, titulo, descripcion, preguntas, porcentaje_aprobacion, duracion_maxima_minutos
)
select
  id,
  'Evaluacion final - Eficiencia y Diseno Basico del Sistema',
  'Cierre integrador sobre eficiencia, variables de diseño y criterios basicos de organizacion del sistema.',
  '[
    {"id":"edbs-final-q1","tipo":"multiple_choice","enunciado":"Que objetivo tiene ajustar el riego a la necesidad del cesped?","opciones":["Mejorar eficiencia y evitar excesos","Aumentar siempre la duracion","Eliminar la presion dinamica","Quitar mediciones de pluviometria"],"respuesta_correcta":0},
    {"id":"edbs-final-q2","tipo":"multiple_choice","enunciado":"La sectorizacion ordenada ayuda a:","opciones":["Distribuir mejor recursos hidraulicos","Eliminar todas las perdidas por friccion","Evitar el uso de valvulas","Reducir el diametro sin analisis"],"respuesta_correcta":0},
    {"id":"edbs-final-q3","tipo":"true_false","enunciado":"Velocidad, diametro y longitud son variables relevantes de diseño.","opciones":["Verdadero","Falso"],"respuesta_correcta":0},
    {"id":"edbs-final-q4","tipo":"true_false","enunciado":"La eficiencia del sistema no depende de la necesidad real de agua.","opciones":["Verdadero","Falso"],"respuesta_correcta":1}
  ]'::jsonb,
  70, 30
from cap_3;

commit;
