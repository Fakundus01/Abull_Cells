import { describe, expect, it } from "vitest";
import {
  parseProductRows,
  parsePriceLoose,
  validateRow,
} from "./parseProductRows";

describe("parseProductRows", () => {
  it("parsea un pegado de Excel (TSV) sin encabezado", () => {
    const text = "Funda iPhone 15\t12500\t10\tFundas\nCargador 20W\t8900\t5\tCargadores";
    const { rows, usedHeader, delimiter } = parseProductRows(text);

    expect(delimiter).toBe("\t");
    expect(usedHeader).toBe(false);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: "Funda iPhone 15",
      price: "12500",
      stock: "10",
      category: "Fundas",
    });
  });

  it("reconoce encabezados en espanol con acentos y en cualquier orden", () => {
    const text = [
      "Precio;Nombre;Categoría",
      "12.500;Funda iPhone 15;Fundas",
      "8.900;Cargador 20W;Cargadores",
    ].join("\n");
    const { rows, usedHeader, delimiter } = parseProductRows(text);

    expect(delimiter).toBe(";");
    expect(usedHeader).toBe(true);
    expect(rows[0]).toMatchObject({
      name: "Funda iPhone 15",
      price: "12.500",
      category: "Fundas",
    });
  });

  it("respeta comillas, comas internas y comillas escapadas", () => {
    const text = 'name,price,description\n"Funda 6,5""",1000,"Rojo, grande"';
    const { rows } = parseProductRows(text);

    expect(rows[0].name).toBe('Funda 6,5"');
    expect(rows[0].description).toBe("Rojo, grande");
  });

  it("soporta saltos de linea dentro de un campo entrecomillado", () => {
    const text = 'name,price,description\nFunda,1000,"Linea 1\nLinea 2"';
    const { rows } = parseProductRows(text);

    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Linea 1\nLinea 2");
  });

  it("ignora filas totalmente vacias", () => {
    const { rows } = parseProductRows("Funda\t100\n\n\nCargador\t200\n");
    expect(rows).toHaveLength(2);
  });

  it("no confunde un producto llamado Oferta con un encabezado", () => {
    const { rows, usedHeader } = parseProductRows("Oferta\t500\t2");
    expect(usedHeader).toBe(false);
    expect(rows[0].name).toBe("Oferta");
  });

  it("devuelve vacio con entrada vacia", () => {
    expect(parseProductRows("").rows).toEqual([]);
    expect(parseProductRows("   \n  ").rows).toEqual([]);
  });
});

describe("parsePriceLoose", () => {
  it.each([
    ["12500", 12500],
    ["12.500", 12500],       // miles a la argentina
    ["$ 12.500", 12500],
    ["12.500,50", 12501],
    ["12,500.50", 12501],
    ["1.234.567", 1234567],
    ["0", 0],
  ])("interpreta %s como %i", (input, expected) => {
    expect(parsePriceLoose(input)).toBe(expected);
  });

  it.each(["", null, undefined, "abc", "-"])("rechaza %s", (input) => {
    expect(parsePriceLoose(input)).toBeNull();
  });
});

describe("validateRow", () => {
  it("acepta una fila valida", () => {
    expect(validateRow({ name: "Funda", price: "1000", stock: "5" })).toEqual({});
  });

  it("exige nombre y precio", () => {
    const errors = validateRow({ name: "  ", price: "" });
    expect(errors.name).toBeTruthy();
    expect(errors.price).toBeTruthy();
  });

  it("rechaza negativos", () => {
    expect(validateRow({ name: "X", price: "-5" }).price).toBeTruthy();
    expect(validateRow({ name: "X", price: "10", stock: "-1" }).stock).toBeTruthy();
  });

  it("permite stock vacio", () => {
    expect(validateRow({ name: "X", price: "10", stock: "" })).toEqual({});
  });
});
