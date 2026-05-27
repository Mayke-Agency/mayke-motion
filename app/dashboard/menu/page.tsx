import { Beef, Plus } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createMenuItemAction } from "@/lib/actions";
import { getMenuItems } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

export default async function MenuPage() {
  const user = await requireBusinessUser();

  if (user.business.businessType.code !== "RESTAURANT") {
    const isStudio = user.business.businessType.code === "DANCE_STUDIO";
    return (
      <>
        <PageHeader
          eyebrow="Catalog"
          title="Menu"
          description={isStudio ? "This workspace is configured as an education client, so menu management is replaced by events and announcements." : "This workspace is configured as retail, so menu management is replaced by product management."}
        />
        <EmptyState title="Menu is not enabled" description={isStudio ? "This education workspace uses Events and Announcements instead of menu management." : "This retail workspace uses the Products page instead of menu management."} />
      </>
    );
  }

  const menuItems = await getMenuItems(user.business.id);

  return (
    <>
      <PageHeader
        eyebrow="Restaurant catalog"
        title="Menu"
        description="Manage menu items, event packages, and popularity signals. Toast or Square menu sync will connect here later."
      />

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Menu library</h2>
              <p>{menuItems.length} dishes, packages, and service items are tracked.</p>
            </div>
            <Beef size={20} />
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Popularity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.length ? (
                  menuItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <div style={{ color: "var(--muted)", marginTop: 4 }}>{item.description}</div>
                      </td>
                      <td>{item.category}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{item.popularityScore}</td>
                      <td>{item.active ? "Active" : "Paused"}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={5} message="No menu items have been added yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Add menu item</h2>
              <p>Create dishes or event packages manually before POS sync.</p>
            </div>
          </div>
          <div className="panel-body">
            <StatefulForm action={createMenuItemAction}>
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
              <SubmitButton>
                <Plus size={16} />
                Add item
              </SubmitButton>
            </StatefulForm>
          </div>
        </section>
      </div>
    </>
  );
}
