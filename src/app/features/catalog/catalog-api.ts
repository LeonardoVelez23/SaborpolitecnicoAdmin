import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { API_BASE_URL, ApiResponse } from '../../core/api/api';

export type ProductStatus = 'disponible' | 'no disponible';

export interface Category {
  id: number;
  nombre: string;
  sucursal_id: number;
}

export interface CatalogProduct {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  cantidad_disponible: number;
  estado: ProductStatus;
  categoria_id: number;
  sucursal_id: number;
  imagen_codigo: string | null;
  categoria?: { id: number; nombre: string } | null;
}

export interface ProductInput {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  cantidad_disponible: number;
  estado: ProductStatus;
  categoria_id: number;
  imagen_codigo: string | null;
}

export interface Branch {
  id: number;
  nombre: string;
  restaurante_id: number;
  restaurante?: { id: number; nombre: string } | null;
}

/** Categorías, productos y sucursales del catálogo (RF-09 a RF-12). */
@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  branches(): Promise<Branch[]> {
    return data(this.http.get<ApiResponse<Branch[]>>(`${this.baseUrl}/sucursales`));
  }

  categories(sucursalId: number): Promise<Category[]> {
    return data(
      this.http.get<ApiResponse<Category[]>>(`${this.baseUrl}/categorias`, {
        params: bySucursal(sucursalId),
      }),
    );
  }

  /** `sucursalId` solo se envía si quien crea no tiene sucursal propia (admin de restaurante, superadmin). */
  createCategory(nombre: string, sucursalId?: number): Promise<Category> {
    return data(
      this.http.post<ApiResponse<Category>>(`${this.baseUrl}/categorias`, {
        nombre,
        ...(sucursalId && { sucursal_id: sucursalId }),
      }),
    );
  }

  renameCategory(id: number, nombre: string): Promise<Category> {
    return data(this.http.put<ApiResponse<Category>>(`${this.baseUrl}/categorias/${id}`, { nombre }));
  }

  deleteCategory(id: number): Promise<void> {
    return data(this.http.delete<ApiResponse<void>>(`${this.baseUrl}/categorias/${id}`));
  }

  products(sucursalId: number): Promise<CatalogProduct[]> {
    return data(
      this.http.get<ApiResponse<CatalogProduct[]>>(`${this.baseUrl}/productos`, {
        params: bySucursal(sucursalId),
      }),
    );
  }

  createProduct(input: ProductInput, sucursalId?: number): Promise<CatalogProduct> {
    return data(
      this.http.post<ApiResponse<CatalogProduct>>(`${this.baseUrl}/productos`, {
        ...input,
        ...(sucursalId && { sucursal_id: sucursalId }),
      }),
    );
  }

  updateProduct(id: number, changes: Partial<ProductInput>): Promise<CatalogProduct> {
    return data(
      this.http.put<ApiResponse<CatalogProduct>>(`${this.baseUrl}/productos/${id}`, changes),
    );
  }

  deleteProduct(id: number): Promise<void> {
    return data(this.http.delete<ApiResponse<void>>(`${this.baseUrl}/productos/${id}`));
  }
}

function bySucursal(sucursalId: number): HttpParams {
  return new HttpParams().set('sucursal_id', sucursalId);
}

async function data<T>(request: Observable<ApiResponse<T>>): Promise<T> {
  return (await firstValueFrom(request)).data;
}
