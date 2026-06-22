-- Add the refund source status snapshot used when a pending refund is rejected.
ALTER TABLE "Refund" ADD COLUMN "previousOrderStatus" TEXT;

-- Prevent duplicate bookings for the same parent demand and tutor.
CREATE UNIQUE INDEX "Order_demandId_tutorId_key" ON "Order"("demandId", "tutorId");
