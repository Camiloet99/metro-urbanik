from pathlib import Path
from typing import List, Optional
from typing import Optional

import sqlite3
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parents[2]  
DB_PATH = BASE_DIR / "db" / "seguridad_santander.db"

app = FastAPI(title="API Seguridad Santander")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def query_db(sql: str, params: tuple = ()) -> List[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# === APP FASTAPI ===
app = FastAPI(
    title="API Seguridad Santander",
    version="0.1.0",
    description="API para consumir los datos procesados y el modelo de riesgo."
)

# CORS para que el front pueda consumir la API desde otra URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # en producción se restringe
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Ping básico para saber que la API está viva."""
    return {
        "message": "API Seguridad Santander OK",
        "endpoints": [
            "/municipios",
            "/delitos",
            "/riesgo",
            "/resumen_delitos",
        ],
    }


# ---------- ENDPOINTS PRINCIPALES ----------

@app.get("/municipios")
def get_municipios():
    """
    Lista de municipios (para combos y unión con el GeoJSON).
    """
    sql = """
        SELECT
            municipio,
            region,
            es_zona_metro
        FROM municipios
        ORDER BY municipio;
    """
    return query_db(sql)


@app.get("/delitos")
def get_delitos(
    municipio: Optional[str] = None,
    categoria: Optional[str] = None,   # HURTO / VIF / SEXUALES
    anio: Optional[int] = None,
    mes: Optional[int] = None,
    genero: Optional[str] = None,
    grupo_etario: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
):
    """
    Datos agregados de delitos_analitica con filtros.
    Se agrupa por municipio/año/mes/categoría/género/grupo_etario.
    """

    filtros = []
    params: list = []

    if municipio:
        filtros.append("municipio = ?")
        params.append(municipio)

    if categoria:
        filtros.append("categoria = ?")
        params.append(categoria)

    if anio:
        filtros.append("anio = ?")
        params.append(anio)

    if mes:
        filtros.append("mes = ?")
        params.append(mes)

    if genero:
        filtros.append("genero = ?")
        params.append(genero)

    if grupo_etario:
        filtros.append("grupo_etario = ?")
        params.append(grupo_etario)

    where_clause = "WHERE " + " AND ".join(filtros) if filtros else ""

    sql = f"""
        SELECT
            municipio,
            anio,
            mes,
            categoria,
            genero,
            grupo_etario,
            SUM(cantidad) AS cantidad
        FROM delitos_analitica
        {where_clause}
        GROUP BY municipio, anio, mes, categoria, genero, grupo_etario
        ORDER BY anio, mes, municipio
        LIMIT ? OFFSET ?;
    """

    params.extend([limit, offset])
    return query_db(sql, tuple(params))


@app.get("/riesgo")
def get_riesgo(
    municipio: Optional[str] = None,
    categoria: Optional[str] = None,   # HURTO / VIF / SEXUALES
    anio: Optional[int] = None,
    mes: Optional[int] = None,
    limit: int = 500,
    offset: int = 0,
):
    """
    Nivel de riesgo por municipio/mes/categoría calculado por el modelo.
    Datos vienen de la tabla riesgo_municipio_mes, que llena el script de ML.
    """

    filtros = []
    params: list = []

    if municipio:
        filtros.append("municipio = ?")
        params.append(municipio)

    if categoria:
        filtros.append("categoria = ?")
        params.append(categoria)

    if anio:
        filtros.append("anio = ?")
        params.append(anio)

    if mes:
        filtros.append("mes = ?")
        params.append(mes)

    where_clause = "WHERE " + " AND ".join(filtros) if filtros else ""

    sql = f"""
        SELECT
            municipio,
            anio,
            mes,
            categoria,
            riesgo_score,
            nivel_riesgo,
            delitos_observados,
            delitos_esperados
        FROM riesgo_municipio_mes
        {where_clause}
        ORDER BY anio, mes, municipio
        LIMIT ? OFFSET ?;
    """

    params.extend([limit, offset])
    return query_db(sql, tuple(params))


@app.get("/resumen_delitos")
def resumen_delitos(
    categoria: str,          
    anio: int,
    municipio: Optional[str] = None,
):
    """
    Resumen anual por municipio para una categoría: total de delitos en el año  arma más frecuente y número de casos con esa arma

    Se apoya en la tabla delitos_analitica (datos limpios).
    """

    filtros_mun = ""
    params: list = [categoria, anio]

    if municipio:
        filtros_mun = "AND municipio = ?"
        params.append(municipio)

    sql = f"""
        WITH base AS (
            SELECT
                municipio,
                anio,
                categoria,
                arma_categoria,
                SUM(cantidad) AS total_casos
            FROM delitos_analitica
            WHERE categoria = ?
              AND anio = ?
              {filtros_mun}
            GROUP BY municipio, anio, categoria, arma_categoria
        ),
        agregados AS (
            SELECT
                municipio,
                anio,
                categoria,
                SUM(total_casos) AS total_anual
            FROM base
            GROUP BY municipio, anio, categoria
        ),
        arma_principal AS (
            SELECT
                b.municipio,
                b.arma_categoria,
                b.total_casos,
                ROW_NUMBER() OVER (
                    PARTITION BY b.municipio
                    ORDER BY b.total_casos DESC
                ) AS rn
            FROM base b
        )
        SELECT
            a.municipio,
            a.anio,
            a.categoria,
            a.total_anual AS total_delitos_anio,
            ap.arma_categoria AS arma_mas_frecuente,
            ap.total_casos AS casos_con_esa_arma
        FROM agregados a
        LEFT JOIN arma_principal ap
               ON a.municipio = ap.municipio
              AND ap.rn = 1
        ORDER BY a.total_anual DESC;
    """

    return query_db(sql, tuple(params))
# -------------------------------------------------------------
# Endpoint para el mapa de calor con coordenadas
# -------------------------------------------------------------

@app.get("/heatmap")
def get_heatmap(
      categoria: str = Query(...),               # obligatorio
    anio: Optional[int] = Query(None),         
    mes: Optional[int] = Query(None),
    genero: Optional[str] = Query(None),
    grupo_etario: Optional[str] = Query(None),
):
    
    filtros = ["d.categoria = ?"]
    params: list = [categoria]

    if anio is not None:
        filtros.append("d.anio = ?")
        params.append(anio)

    if mes is not None:
        filtros.append("d.mes = ?")
        params.append(mes)

    if genero is not None:
        filtros.append("d.genero = ?")
        params.append(genero)

    if grupo_etario is not None:
        filtros.append("d.grupo_etario = ?")
        params.append(grupo_etario)

    where_clause = " AND ".join(filtros) if filtros else "1=1"

    sql = f"""
        SELECT
            d.municipio,
            c.lat,
            c.lng,
            SUM(d.cantidad) AS count
        FROM delitos_analitica d
        LEFT JOIN coordenadas_municipios c
            ON UPPER(TRIM(d.municipio)) = UPPER(TRIM(c.municipio))
        WHERE {where_clause}
        GROUP BY d.municipio, c.lat, c.lng
        HAVING c.lat IS NOT NULL AND c.lng IS NOT NULL
    """

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(sql, tuple(params))
    rows = cur.fetchall()
    conn.close()

    return [
        {
            "municipio": row[0],
            "lat": row[1],
            "lng": row[2],
            "count": row[3],
        }
        for row in rows
    ]
@app.get("/estadisticas")
def estadisticas(
    categoria: str = Query(..., description="Delito a analizar"),
    anio: Optional[int] = None,
):
    """
    Devuelve:
    - Total de casos del delito
    - Municipio con más casos y su porcentaje
    - Delito más frecuente en todo el departamento
    - Grupo poblacional más afectado
    """
    params: list = [categoria]
    filtros = ["categoria = ?"]

    if anio:
        filtros.append("anio = ?")
        params.append(anio)

    where_clause = "WHERE " + " AND ".join(filtros)

    # Total general
    sql_total = f"""
        SELECT SUM(cantidad) AS total
        FROM delitos_analitica
        {where_clause};
    """

    total_data = query_db(sql_total, tuple(params))
    total = total_data[0]["total"] if total_data and total_data[0]["total"] else 0

    # Municipio con más casos
    sql_mun = f"""
        SELECT municipio, SUM(cantidad) AS total_mun
        FROM delitos_analitica
        {where_clause}
        GROUP BY municipio
        ORDER BY total_mun DESC
        LIMIT 1;
    """

    mun_data = query_db(sql_mun, tuple(params))
    municipio_top = mun_data[0]["municipio"] if mun_data else None
    total_mun = mun_data[0]["total_mun"] if mun_data else 0

    porcentaje_mun = round((total_mun / total) * 100, 2) if total > 0 else 0

    # Delito más frecuente (en general)
    sql_delito = """
        SELECT categoria, SUM(cantidad) AS total
        FROM delitos_analitica
        GROUP BY categoria
        ORDER BY total DESC
        LIMIT 1;
    """
    delito_top = query_db(sql_delito)[0]

    # Grupo poblacional más afectado
    sql_grupo = f"""
        SELECT grupo_etario, SUM(cantidad) AS total
        FROM delitos_analitica
        {where_clause}
        GROUP BY grupo_etario
        ORDER BY total DESC
        LIMIT 1;
    """

    grupo_data = query_db(sql_grupo, tuple(params))
    grupo = grupo_data[0]["grupo_etario"] if grupo_data else None
    grupo_total = grupo_data[0]["total"] if grupo_data else 0

    return {
        "total_casos": total,
        "municipio_mas_afectado": municipio_top,
        "casos_en_municipio": total_mun,
        "porcentaje_departamental": porcentaje_mun,
        "delito_mas_frecuente": delito_top,
        "grupo_mas_afectado": {
            "nombre": grupo,
            "casos": grupo_total,
        },
    }
