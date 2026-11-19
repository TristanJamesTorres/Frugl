export type SellerListingStatusPatch = {
  status: 'available' | 'reserved' | 'sold';
  reserved_by?: string | null;
  reserved_until?: null;
  buyer_id?: string | null;
  sold_transaction_id?: null;
};

export function sellerListingStatusPatch(
  currentStatus: string,
  requestedStatus: unknown
): SellerListingStatusPatch | null {
  if (currentStatus === 'available' && requestedStatus === 'reserved') {
    return {
      status: 'reserved',
      reserved_by: null,
      reserved_until: null,
      buyer_id: null,
      sold_transaction_id: null,
    };
  }

  if (
    (currentStatus === 'reserved' || currentStatus === 'sold') &&
    requestedStatus === 'available'
  ) {
    return {
      status: 'available',
      reserved_by: null,
      reserved_until: null,
      buyer_id: null,
      sold_transaction_id: null,
    };
  }

  return null;
}
