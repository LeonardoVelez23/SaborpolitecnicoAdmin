import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { API_BASE_URL, ApiResponse } from '../../core/api/api';

export type OrderStatus = 'solicitado' | 'confirmado' | 'en preparación' | 'listo' | 'entregado' | 'cancelado';
export type Modality = 'presencial' | 'en línea';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';
export type PaymentStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'reembolsado';
export type AffiliationStatus = 'activo' | 'bloqueado' | 'retirado';

export interface PersonRef {
  id: number;
  nombres?: string;
  apellidos?: string;
}

export interface OrderLine {
  id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: { id: number; codigo?: string; nombre: string } | null;
}

export interface Order {
  id: number;
  fecha: string;
  hora: string;
  modalidad: Modality;
  estado: OrderStatus;
  valor_total: number;
  cliente_id: number;
  empleado_id: number | null;
  empleado_preparacion_id: number | null;
  sucursal_id: number;
  createdAt: string;
  cliente?: PersonRef | null;
  empleadoResponsable?: PersonRef | null;
  empleadoPreparacion?: PersonRef | null;
  detalles: OrderLine[];
}

export interface Payment {
  id: number;
  pedido_id: number;
  fecha: string;
  valor: number;
  metodo_pago: PaymentMethod;
  numero_referencia: string | null;
  estado: PaymentStatus;
}

export interface Product {
  id: number;
  codigo: string;
  nombre: string;
  precio: number;
  cantidad_disponible: number;
  estado: 'disponible' | 'no disponible';
}

export interface ClientMatch {
  id: number;
  nombres: string;
  apellidos: string;
  /** Estado de la afiliación al restaurante de quien busca; `null` si no está afiliado. */
  afiliacion: AffiliationStatus | null;
}

export interface OrderUpdate {
  estado?: OrderStatus;
  empleado_id?: number | null;
  empleado_preparacion_id?: number | null;
}

export interface PaymentInput {
  metodo_pago: PaymentMethod;
  numero_referencia: string | null;
}

export interface AssistedOrderInput {
  cliente_id: number;
  modalidad: Modality;
  detalles: { producto_id: number; cantidad: number }[];
  consentimiento_presencial: boolean;
}

/** Pedidos, pagos, productos y clientes para el tablero (RF-14 a RF-24). */
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  orders(): Promise<Order[]> {
    return data(this.http.get<ApiResponse<Order[]>>(`${this.baseUrl}/pedidos`));
  }

  payments(): Promise<Payment[]> {
    return data(this.http.get<ApiResponse<Payment[]>>(`${this.baseUrl}/pagos`));
  }

  updateOrder(id: number, changes: OrderUpdate): Promise<Order> {
    return data(this.http.put<ApiResponse<Order>>(`${this.baseUrl}/pedidos/${id}`, changes));
  }

  /** Registra el pago del pedido como aprobado (cobro en caja). */
  registerPayment(order: Order, input: PaymentInput): Promise<Payment> {
    return data(
      this.http.post<ApiResponse<Payment>>(`${this.baseUrl}/pagos`, {
        pedido_id: order.id,
        fecha: new Date().toISOString(),
        valor: order.valor_total,
        metodo_pago: input.metodo_pago,
        numero_referencia: input.numero_referencia,
        estado: 'aprobado',
      }),
    );
  }

  /** Aprueba un pago pendiente o rechazado con el método y la referencia del cobro. */
  approvePayment(payment: Payment, input: PaymentInput): Promise<Payment> {
    return data(
      this.http.put<ApiResponse<Payment>>(`${this.baseUrl}/pagos/${payment.id}`, {
        metodo_pago: input.metodo_pago,
        numero_referencia: input.numero_referencia,
        estado: 'aprobado',
      }),
    );
  }

  products(sucursalId: number | null | undefined): Promise<Product[]> {
    const params = sucursalId ? new HttpParams().set('sucursal_id', sucursalId) : undefined;
    return data(this.http.get<ApiResponse<Product[]>>(`${this.baseUrl}/productos`, { params }));
  }

  /** Busca un cliente por identificación o correo exactos (RF-44). 404 si no existe. */
  findClient(query: string): Promise<ClientMatch> {
    const params = new HttpParams().set('q', query.trim());
    return data(this.http.get<ApiResponse<ClientMatch>>(`${this.baseUrl}/clientes/buscar`, { params }));
  }

  createAssistedOrder(input: AssistedOrderInput): Promise<Order> {
    return data(this.http.post<ApiResponse<Order>>(`${this.baseUrl}/pedidos`, input));
  }
}

async function data<T>(request: Observable<ApiResponse<T>>): Promise<T> {
  return (await firstValueFrom(request)).data;
}
