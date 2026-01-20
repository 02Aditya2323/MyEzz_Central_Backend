# System Architecture: MyEzz Live Order Tracking

This diagram visualizes the **Hybrid Data Architecture** and **Real-Time Event Flow** across the implementation.

```mermaid
graph TD
    %% -- Styles --
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef server fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef db fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef ext fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;

    %% -- Clients --
    subgraph "Clients (Frontend Layer)"
        CustomerApp[📱 MyEzz (Customer)]:::client
        VendorApp[🏪 MyEzz_Restaurants]:::client
        RiderApp[🛵 MyEzz_Rider]:::client
    end

    %% -- Backend --
    subgraph "Core Infrastructure"
        Backend[⚙️ Central Backend Service<br/>(Node.js / Express / Socket.io)]:::server
    end

    %% -- Databases --
    subgraph "Hybrid Database Layer"
        Supabase[(⚡ Supabase<br/>PostgreSQL)]:::db
        MongoDB[(🍃 MongoDB Atlas<br/>NoSQL)]:::db
    end

    %% -- Relationships --

    %% 1. Auth & Menus (Supabase)
    CustomerApp <-->|Auth & Fetch Menu| Supabase
    VendorApp <-->|Auth & Manage Menu| Supabase
    RiderApp <-->|Auth| Supabase
    Backend -.->|Verify Tokens| Supabase

    %% 2. Orders (MongoDB through Backend)
    CustomerApp -->|POST /orders| Backend
    VendorApp <-->|GET /orders/active<br/>PATCH /status| Backend
    RiderApp <-->|GET /orders/available<br/>POST /accept| Backend
    Backend <-->|Store/Retrieve Orders| MongoDB

    %% 3. Live Tracking (Sockets)
    RiderApp -- "Socket: update_location<br/>(Every 3s)" --> Backend
    Backend -- "Socket: location_changed<br/>(Broadcast Room)" --> CustomerApp
    Backend -.->|Persist History| MongoDB

    %% 4. Multi-Restaurant Logic
    CustomerApp -.->|Splits Cart| InternalLogic[Split Order Logic]
    InternalLogic -->|Order A| Backend
    InternalLogic -->|Order B| Backend

```

## Data Flow Breakdown

### 1. The Order Lifecycle
1.  **Customer** authenticates via **Supabase**.
2.  **Customer** fetches menu items directly from **Supabase**.
3.  **Customer** places an order. The frontend calls the **Central Backend** (`POST /api/orders`).
4.  **Backend** saves the order to **MongoDB** (`orders` collection).
5.  **Vendor** polls or listens for new orders and updates status to "Ready".

### 2. The Live Tracking Loop (Phase 3)
1.  **Rider** accepts order (`POST /api/rider/accept`).
2.  Order Status becomes `out_for_delivery`.
3.  **Rider App** starts broadcasting GPS to **Backend** via WebSocket (`update_location`).
4.  **Backend** saves the ping to **MongoDB** (`rider_locations`) for history/analytics.
5.  **Backend Immediately Broadcasts** the location to the **Customer** via WebSocket (`location_changed`).
6.  **Customer App** interpolates the marker movement on the Mapbox map.
