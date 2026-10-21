import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrders } from "@/lib/api";
import type { Order, Paginated } from "@/types/api";
import { OrdersView } from "./OrdersView";

vi.mock("@/lib/api", () => ({ getOrders: vi.fn() }));

const getOrdersMock = vi.mocked(getOrders);

function makeOrders(count: number): Order[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `order-${i + 1}`,
    userId: "user-1",
    status: "PENDING",
    totalAmount: "10.00",
    items: [],
  }));
}

function pageOf(data: Order[], page: number, total: number): Paginated<Order> {
  return {
    data,
    meta: { page, limit: 20, total, totalPages: Math.ceil(total / 20) },
  };
}

function view(page: number) {
  return <OrdersView page={page} headingId="orders-heading" />;
}

function cards() {
  return screen
    .queryAllByRole("link")
    .filter((l) => /^\/orders\/order-/.test(l.getAttribute("href") ?? ""));
}

describe("OrdersView edge states (QA)", () => {
  beforeEach(() => getOrdersMock.mockReset());

  it("drops a slow page-1 response that resolves after the user moved to page 2", async () => {
    let resolveFirst: (v: Paginated<Order>) => void = () => {};
    getOrdersMock
      .mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce(pageOf(makeOrders(8), 2, 28));

    const { rerender } = render(view(1));
    rerender(view(2));
    await waitFor(() => expect(cards()).toHaveLength(8));
    resolveFirst(pageOf(makeOrders(20), 1, 28));
    await new Promise((r) => setTimeout(r, 20));

    expect(cards()).toHaveLength(8);
    expect(screen.getAllByText(/Page 2 of 2/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Page 1 of 2/)).toBeNull();
  });

  it("leaves the error state when the user navigates to another page, and shows no empty message", async () => {
    getOrdersMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(pageOf(makeOrders(20), 1, 28));

    const { rerender } = render(view(2));
    await screen.findByRole("alert");
    rerender(view(1));

    await waitFor(() => expect(cards()).toHaveLength(20));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("No orders found.")).toBeNull();
  });

  it('uses the singular "There is 1 page." in the out-of-range message', async () => {
    getOrdersMock.mockResolvedValue(pageOf([], 5, 15));

    render(view(5));

    expect(
      await screen.findByText(/Page 5 doesn't exist\. There is 1 page\./),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Go to last page (page 1)" })
        .getAttribute("href"),
    ).toBe("/orders");
  });

  it("links out-of-range straight to the last page and hides Previous/Next", async () => {
    getOrdersMock.mockResolvedValue(pageOf([], 9, 28));

    render(view(9));

    const link = await screen.findByRole("link", {
      name: "Go to last page (page 2)",
    });
    expect(link.getAttribute("href")).toBe("/orders?page=2");
    expect(
      screen.queryByRole("navigation", { name: "Orders pagination" }),
    ).toBeNull();
  });

  it("shows the API error text, not the empty message, after a failed retry", async () => {
    getOrdersMock
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"));

    render(view(1));
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("second"),
    );
    expect(screen.queryByText("No orders found.")).toBeNull();
  });

  it("falls back to a generic message when the thrown error is not an Error", async () => {
    getOrdersMock.mockRejectedValueOnce("nope");

    render(view(1));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Something went wrong.",
    );
  });

  it("renders exactly one 100-order-sized page of cards without pagination when total fits", async () => {
    getOrdersMock.mockResolvedValue(pageOf(makeOrders(20), 1, 20));

    render(view(1));

    await waitFor(() => expect(cards()).toHaveLength(20));
    expect(
      screen.queryByRole("navigation", { name: "Orders pagination" }),
    ).toBeNull();
  });
});
