import { Boxes, Plus } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createProductAction } from "@/lib/actions";
import { getProducts } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

export default async function ProductsPage() {
  const user = await requireBusinessUser();

  if (user.business.businessType.code !== "RETAIL") {
    const isStudio = user.business.businessType.code === "DANCE_STUDIO";
    return (
      <>
        <PageHeader
          eyebrow="Catalog"
          title="Products"
          description={isStudio ? "This workspace is configured as an education client, so product management is replaced by events and announcements." : "This workspace is configured as a restaurant, so product management is replaced by menu management."}
        />
        <EmptyState title="Product catalog is not enabled" description={isStudio ? "This education workspace uses Events and Announcements instead of product management." : "This restaurant workspace uses the Menu page instead of product management."} />
      </>
    );
  }

  const products = await getProducts(user.business.id);

  return (
    <>
      <PageHeader
        eyebrow="Commerce catalog"
        title="Products"
        description="Manage sellable products and inventory signals. Shopify sync will connect here in a future integration."
      />

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Product catalog</h2>
              <p>{products.length} active and draft products for {user.business.name}.</p>
            </div>
            <Boxes size={20} />
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Inventory</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.length ? (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <div style={{ color: "var(--muted)", marginTop: 4 }}>{product.description}</div>
                      </td>
                      <td>{product.category}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.inventory}</td>
                      <td>{product.active ? "Active" : "Draft"}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={5} message="No products have been added yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Add product</h2>
              <p>Create a retail item manually before Shopify is connected.</p>
            </div>
          </div>
          <div className="panel-body">
            <StatefulForm action={createProductAction}>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input className="input" id="name" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea className="textarea" id="description" name="description" required />
              </div>
              <div className="field">
                <label htmlFor="category">Category</label>
                <input className="input" id="category" name="category" required />
              </div>
              <div className="field">
                <label htmlFor="price">Price</label>
                <input className="input" id="price" name="price" type="number" min="1" step="0.01" required />
              </div>
              <div className="field">
                <label htmlFor="inventory">Inventory</label>
                <input className="input" id="inventory" name="inventory" type="number" min="0" defaultValue="12" required />
              </div>
              <SubmitButton>
                <Plus size={16} />
                Add product
              </SubmitButton>
            </StatefulForm>
          </div>
        </section>
      </div>
    </>
  );
}
