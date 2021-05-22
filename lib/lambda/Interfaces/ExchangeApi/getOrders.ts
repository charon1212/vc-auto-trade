import { getOrders } from "./Bitflyer/getOrders";
import { Order } from '../DomainType';

export const getAllOrders = async (productCode: string): Promise<Order[]> => {

  const orders = await getOrders(productCode);
  return orders;

};
