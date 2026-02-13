"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RefreshCw, ExternalLink, Package, Truck, User, Scissors } from "lucide-react"
import { ShipOrderModal } from "./ship-order-modal"
import { SplitOrderModal } from "./split-order-modal"

type OrderStatus = "All" | "To Ship" | "Processed" | "Shipping" | "Completed" | "Cancelled"

export interface ShopeeOrderData {
  id: string
  orderSn: string
  buyerName: string | null
  productNames: string | null
  totalAmount: number
  status: string
  trackingNumber?: string | null
  createTime: string
  raw: any
}

interface OrdersTableProps {
  orders: ShopeeOrderData[]
  loading: boolean
  onRefresh?: () => void
}

function getStatusLabel(order: ShopeeOrderData): OrderStatus {
  const shopeeStatus = order.status
  switch (shopeeStatus) {
    case "READY_TO_SHIP":
    case "UNPAID":
      return "To Ship"
    case "PROCESSED":
      return "Processed"
    case "SHIPPED":
    case "TO_CONFIRM_RECEIVE":
      return "Shipping"
    case "COMPLETED":
    case "IN_RETURNING":
    case "RETURNED":
      return "Completed"
    case "CANCELLED":
    case "IN_CANCEL":
      return "Cancelled"
    default:
      return "To Ship"
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "To Ship":
      return "bg-warning/10 text-warning border-warning/20"
    case "Processed":
      return "bg-orange-50 text-orange-600 border-orange-200"
    case "Shipping":
      return "bg-primary/10 text-primary border-primary/20"
    case "Completed":
      return "bg-success/10 text-success border-success/20"
    case "Cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20"
    default:
      return ""
  }
}

function getItemList(order: ShopeeOrderData): any[] {
  return order.raw?.item_list || []
}

function hasMultipleItems(order: ShopeeOrderData): boolean {
  return getItemList(order).length > 1
}

export function OrdersTable({ orders, loading, onRefresh }: OrdersTableProps) {
  const [activeTab, setActiveTab] = useState<OrderStatus>("All")
  const [selectedOrder, setSelectedOrder] = useState<ShopeeOrderData | null>(null)

  // Modal states
  const [shipModal, setShipModal] = useState<{ open: boolean; orderSn: string; isProcessed?: boolean }>({ open: false, orderSn: "", isProcessed: false })
  const [splitModal, setSplitModal] = useState<{ open: boolean; orderSn: string; items: any[] }>({ open: false, orderSn: "", items: [] })

  const mappedOrders = orders.map(o => {
    const uiStatus = getStatusLabel(o)
    const items = getItemList(o)
    return {
      ...o,
      uiStatus,
      uiAmount: `RM ${o.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      uiDate: new Date(o.createTime).toLocaleDateString(),
      items,
      canShip: o.status === "READY_TO_SHIP",
      canSplit: o.status === "READY_TO_SHIP" && items.length > 1,
      isProcessed: o.status === "PROCESSED"
    }
  })

  const filteredOrders =
    activeTab === "All" ? mappedOrders : mappedOrders.filter((o) => o.uiStatus === activeTab)

  const statusCounts = {
    All: mappedOrders.length,
    "To Ship": mappedOrders.filter((o) => o.uiStatus === "To Ship").length,
    Processed: mappedOrders.filter((o) => o.uiStatus === "Processed").length,
    Shipping: mappedOrders.filter((o) => o.uiStatus === "Shipping").length,
    Completed: mappedOrders.filter((o) => o.uiStatus === "Completed").length,
    Cancelled: mappedOrders.filter((o) => o.uiStatus === "Cancelled").length,
  }

  const handleShipSuccess = () => {
    onRefresh?.()
  }

  const handleSplitSuccess = () => {
    onRefresh?.()
  }

  if (loading && orders.length === 0) {
    return (
      <Card className="border border-border shadow-sm">
        <CardContent className="h-48 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading orders...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border border-border shadow-sm">
        <CardContent className="p-0">
          {/* Filter Tabs */}
          <div className="border-b border-border px-6 pt-4 pb-0">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as OrderStatus)}
            >
              <TabsList className="h-auto gap-1 bg-transparent p-0">
                {(["All", "To Ship", "Processed", "Shipping", "Completed", "Cancelled"] as const).map(
                  (tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                    >
                      {tab}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {statusCounts[tab]}
                      </span>
                    </TabsTrigger>
                  )
                )}
              </TabsList>
            </Tabs>
          </div>

          {/* Orders Table */}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Order ID
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Products
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Buyer
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => setSelectedOrder(order)}
                >
                  <TableCell className="pl-6 font-mono text-xs font-medium text-foreground">
                    {order.orderSn}
                  </TableCell>
                  <TableCell className="max-w-[250px] text-sm text-foreground">
                    {order.items.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 truncate">
                            <span className="truncate text-sm">{item.item_name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground font-mono">
                              x{item.model_quantity_purchased || 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="truncate">{order.productNames || "No items"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{order.buyerName || "Unknown"}</TableCell>
                  <TableCell className="font-mono text-sm text-foreground">
                    {order.uiAmount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] font-semibold",
                        getStatusClasses(order.uiStatus)
                      )}
                    >
                      {order.uiStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1">
                      {order.canShip && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 justify-start"
                          onClick={() => setShipModal({ open: true, orderSn: order.orderSn, isProcessed: false })}
                        >
                          Arrange Shipment
                        </Button>
                      )}
                      {order.canSplit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs font-medium text-chart-2 hover:text-chart-2 hover:bg-chart-2/10 justify-start"
                          onClick={() => setSplitModal({
                            open: true,
                            orderSn: order.orderSn,
                            items: order.items
                          })}
                        >
                          Split Order
                        </Button>
                      )}
                      {order.isProcessed && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 justify-start"
                            onClick={() => setShipModal({ open: true, orderSn: order.orderSn, isProcessed: true })}
                          >
                            View Pickup Details
                          </Button>
                        </>
                      )}
                      {!order.canShip && !order.canSplit && !order.isProcessed && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No orders found for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Detail Drawer */}
      <Sheet open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base font-bold text-foreground">
                  Order Details
                </SheetTitle>
                <SheetDescription className="font-mono text-sm">
                  {selectedOrder.orderSn}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-5">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold",
                      getStatusClasses(getStatusLabel(selectedOrder))
                    )}
                  >
                    {getStatusLabel(selectedOrder)}
                  </Badge>
                </div>

                <Separator />

                {/* Buyer Info */}
                <div className="flex flex-col gap-3">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    Buyer Information
                  </h4>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm font-medium text-foreground">
                      {selectedOrder.buyerName || "Unknown"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Date: {new Date(selectedOrder.createTime).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="flex flex-col gap-3">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    Order Items
                  </h4>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    {getItemList(selectedOrder).length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {getItemList(selectedOrder).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.item_name}
                              </p>
                              {item.model_name && (
                                <p className="text-xs text-muted-foreground">
                                  Variation: {item.model_name}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-mono text-muted-foreground ml-2">
                              x{item.model_quantity_purchased || 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground">{selectedOrder.productNames || "No items"}</p>
                    )}
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Total</span>
                      <span className="font-mono text-base font-bold text-foreground">
                        RM {selectedOrder.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shipping */}
                {selectedOrder.raw?.tracking_number && (
                  <div className="flex flex-col gap-3">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" />
                      Shipping
                    </h4>
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tracking</span>
                        <span className="font-mono text-sm font-medium text-foreground">
                          {selectedOrder.raw.tracking_number}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  {(selectedOrder.status === "READY_TO_SHIP" || selectedOrder.status === "PROCESSED") && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedOrder(null)
                        setShipModal({ open: true, orderSn: selectedOrder.orderSn, isProcessed: selectedOrder.status === "PROCESSED" })
                      }}
                    >
                      <Truck className="mr-2 h-3.5 w-3.5" />
                      Arrange Shipment
                    </Button>
                  )}
                  {hasMultipleItems(selectedOrder) && (selectedOrder.status === "READY_TO_SHIP" || selectedOrder.status === "PROCESSED") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedOrder(null)
                        setSplitModal({
                          open: true,
                          orderSn: selectedOrder.orderSn,
                          items: getItemList(selectedOrder)
                        })
                      }}
                    >
                      <Scissors className="mr-2 h-3.5 w-3.5" />
                      Split Order
                    </Button>
                  )}
                  <Button variant="outline" className="w-full bg-transparent" size="sm" asChild>
                    <a
                      href={`https://seller.shopee.com.my/portal/sale/order/${selectedOrder.orderSn}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      View on Shopee
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Ship Order Modal */}
      <ShipOrderModal
        open={shipModal.open}
        onClose={() => setShipModal({ open: false, orderSn: "", isProcessed: false })}
        orderSn={shipModal.orderSn}
        isProcessed={shipModal.isProcessed}
        onSuccess={handleShipSuccess}
      />

      {/* Split Order Modal */}
      <SplitOrderModal
        open={splitModal.open}
        onClose={() => setSplitModal({ open: false, orderSn: "", items: [] })}
        orderSn={splitModal.orderSn}
        items={splitModal.items}
        onSuccess={handleSplitSuccess}
      />
    </>
  )
}
