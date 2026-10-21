-- CreateIndex
CREATE INDEX "Order_createdAt_id_idx" ON "Order"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_id_idx" ON "Order"("userId", "createdAt", "id");
