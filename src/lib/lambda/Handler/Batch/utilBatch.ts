import { ProductId } from "../../Main/productSettings";
import { deleteAllUnkActOrdersFromDb } from "../../UtilBatch/deleteAllUnkActOrdersFromDb";
import { initializeProductContext } from "../../UtilBatch/initializeProductContext";

type Event = {
  batchName?: string,
  productId?: ProductId | 'All';
};

exports.handler = async (event: Event) => {

  const { batchName, productId } = event;
  if (batchName === 'initializeProductContext' && productId) return await initializeProductContext(productId);
  if (batchName === 'deleteAllUnkActOrdersFromDb' && productId) return await deleteAllUnkActOrdersFromDb(productId);

  return 'どのバッチも実行されませんでした。';

};
