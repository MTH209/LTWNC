/**
 * ============================================================
 * MODULE: Quản lý đơn hàng (Order Management)
 * ============================================================
 * File này định nghĩa toàn bộ type cho 4 entity chính:
 *   - Customer
 *   - Product
 *   - OrderItem
 *   - Order
 *
 * Đồng thời cung cấp các type dùng chung (generic) và tận dụng
 * Utility Types (Partial, Pick, Omit, Record, Required...) để
 * tránh lặp lại code khi định nghĩa các DTO (Data Transfer Object)
 * cho việc tạo mới / cập nhật / hiển thị dữ liệu.
 * ============================================================
 */

/* ------------------------------------------------------------
 * 1. ENUM - các tập giá trị cố định, có ý nghĩa nghiệp vụ rõ ràng
 * ------------------------------------------------------------ */

/** Trạng thái đơn hàng trong vòng đời xử lý */
export enum OrderStatus {
  PENDING = "PENDING", // Mới tạo, chờ xác nhận
  CONFIRMED = "CONFIRMED", // Đã xác nhận, chờ xử lý
  PROCESSING = "PROCESSING", // Đang chuẩn bị hàng
  SHIPPED = "SHIPPED", // Đã giao cho đơn vị vận chuyển
  DELIVERED = "DELIVERED", // Đã giao thành công
  CANCELLED = "CANCELLED", // Đã huỷ
  RETURNED = "RETURNED", // Đã hoàn trả
}

/** Phương thức thanh toán */
export enum PaymentMethod {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  CREDIT_CARD = "CREDIT_CARD",
  E_WALLET = "E_WALLET",
}

/** Trạng thái thanh toán, tách riêng khỏi trạng thái đơn hàng
 *  vì một đơn có thể "DELIVERED" nhưng vẫn "UNPAID" (COD chưa thu) */
export enum PaymentStatus {
  UNPAID = "UNPAID",
  PAID = "PAID",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  REFUNDED = "REFUNDED",
}

/** Danh mục sản phẩm */
export enum ProductCategory {
  ELECTRONICS = "ELECTRONICS",
  FASHION = "FASHION",
  HOME = "HOME",
  BOOKS = "BOOKS",
  FOOD = "FOOD",
  OTHER = "OTHER",
}

/* ------------------------------------------------------------
 * 2. GENERIC TYPE DÙNG CHUNG (tái sử dụng cho nhiều entity)
 * ------------------------------------------------------------ */

/** Các field mà entity nào cũng có -> tách ra để "extends" thay vì
 *  copy-paste id/createdAt/updatedAt vào từng interface */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Kết quả trả về chuẩn hoá cho API, generic theo kiểu dữ liệu T
 *  -> dùng lại được cho Order, Product, Customer, ... */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

/** Kết quả phân trang, generic theo kiểu item T */
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** "Kho" thao tác CRUD chung, generic theo Entity và kiểu ID
 *  -> mọi service (OrderRepository, ProductRepository...) đều
 *     tuân theo cùng 1 interface, dễ mock/test và đảm bảo tính nhất quán */
export interface Repository<TEntity extends BaseEntity, TCreateDto, TUpdateDto> {
  findById(id: string): Promise<TEntity | null>;
  findAll(): Promise<TEntity[]>;
  create(dto: TCreateDto): Promise<TEntity>;
  update(id: string, dto: TUpdateDto): Promise<TEntity>;
  delete(id: string): Promise<boolean>;
}

/* ------------------------------------------------------------
 * 3. CUSTOMER
 * ------------------------------------------------------------ */

export interface Address {
  street: string;
  ward?: string;
  district: string;
  city: string;
  country: string;
}

export interface Customer extends BaseEntity {
  fullName: string;
  email: string;
  phone: string;
  address: Address;
  isVip: boolean;
}

/** DTO tạo khách hàng: bỏ các field do hệ thống tự sinh (id, createdAt, updatedAt)
 *  -> Omit giúp không phải khai báo lại toàn bộ field còn lại */
export type CreateCustomerDto = Omit<Customer, keyof BaseEntity>;

/** DTO cập nhật khách hàng: mọi field đều optional vì có thể chỉ sửa 1 vài field
 *  -> Partial<Omit<...>> tái sử dụng type gốc thay vì viết lại interface mới */
export type UpdateCustomerDto = Partial<CreateCustomerDto>;

/** Thông tin khách hàng rút gọn, dùng khi hiển thị trong danh sách đơn hàng
 *  -> Pick chỉ lấy đúng những field cần thiết, giảm payload */
export type CustomerSummary = Pick<Customer, "id" | "fullName" | "phone" | "isVip">;

/* ------------------------------------------------------------
 * 4. PRODUCT
 * ------------------------------------------------------------ */

export interface Product extends BaseEntity {
  sku: string;
  name: string;
  category: ProductCategory;
  unitPrice: number;
  stockQuantity: number;
  isActive: boolean;
}

export type CreateProductDto = Omit<Product, keyof BaseEntity>;
export type UpdateProductDto = Partial<CreateProductDto>;

/** Thông tin sản phẩm rút gọn để nhúng vào OrderItem
 *  -> tránh lặp lại toàn bộ Product (không cần stockQuantity, isActive...) */
export type ProductSnapshot = Pick<Product, "id" | "sku" | "name" | "unitPrice">;

/* ------------------------------------------------------------
 * 5. ORDER ITEM
 * ------------------------------------------------------------ */

export interface OrderItem {
  id: string;
  product: ProductSnapshot; // "snapshot" giá tại thời điểm đặt hàng, không dùng Product trực tiếp
  quantity: number;
  unitPrice: number; // có thể khác giá hiện tại của Product (giảm giá, khuyến mãi)
  readonly subTotal: number; // = quantity * unitPrice (computed tại runtime)
}

/** DTO tạo OrderItem: FE chỉ cần gửi productId + quantity,
 *  còn lại (giá, snapshot) do backend tự tính -> Pick kết hợp field mới */
export type CreateOrderItemDto = {
  productId: string;
} & Pick<OrderItem, "quantity">;

/* ------------------------------------------------------------
 * 6. ORDER
 * ------------------------------------------------------------ */

export interface Order extends BaseEntity {
  orderCode: string;
  customer: CustomerSummary; // tái sử dụng type đã Pick ở trên
  items: OrderItem[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  note?: string;
  totalAmount: number;
}

/** DTO tạo đơn hàng: bỏ field hệ thống tự sinh + field tự tính (totalAmount)
 *  đồng thời thay "items" bằng CreateOrderItemDto[] và "customer" bằng customerId
 *  -> minh hoạ Omit kết hợp với việc "override" field bằng intersection (&) */
export type CreateOrderDto = Omit<
  Order,
  keyof BaseEntity | "items" | "customer" | "totalAmount" | "status" | "paymentStatus"
> & {
  customerId: string;
  items: CreateOrderItemDto[];
};

/** DTO cập nhật trạng thái đơn hàng: chỉ cho sửa 2 field trạng thái
 *  -> Pick + Partial: lấy đúng field cần, và cho phép sửa từng field một */
export type UpdateOrderStatusDto = Partial<Pick<Order, "status" | "paymentStatus">>;

/** Bản ghi đơn hàng dùng cho bảng thống kê: bắt buộc phải có đủ mọi field
 *  (kể cả field vốn optional) -> minh hoạ Utility Type "Required" */
export type OrderReportRecord = Required<Order>;

/** Map trạng thái đơn hàng -> nhãn hiển thị tiếng Việt
 *  -> Record<K, V> đảm bảo đủ tất cả key của enum, không thiếu label nào */
export const OrderStatusLabel: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Chờ xác nhận",
  [OrderStatus.CONFIRMED]: "Đã xác nhận",
  [OrderStatus.PROCESSING]: "Đang xử lý",
  [OrderStatus.SHIPPED]: "Đang giao hàng",
  [OrderStatus.DELIVERED]: "Đã giao hàng",
  [OrderStatus.CANCELLED]: "Đã huỷ",
  [OrderStatus.RETURNED]: "Đã hoàn trả",
};

/* ------------------------------------------------------------
 * 7. VÍ DỤ SỬ DỤNG REPOSITORY GENERIC CHO ORDER
 * ------------------------------------------------------------ */

/** Khai báo interface cụ thể cho OrderRepository bằng cách "cắm" 3 type
 *  vào generic Repository<TEntity, TCreateDto, TUpdateDto> đã định nghĩa ở trên */
export interface OrderRepository
  extends Repository<Order, CreateOrderDto, UpdateOrderStatusDto> {
  findByCustomerId(customerId: string): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
}

/* ============================================================
 * GIẢI THÍCH THIẾT KẾ (vì sao thiết kế như vậy)
 * ============================================================
 *
 * 1. Dùng enum thay vì string literal rời rạc cho OrderStatus,
 *    PaymentMethod, PaymentStatus, ProductCategory: đảm bảo giá trị
 *    hợp lệ được kiểm tra ở compile-time, tránh gõ sai chuỗi, và dễ
 *    dàng mở rộng thêm trạng thái mới ở một nơi duy nhất.
 *
 * 2. Tách BaseEntity (id, createdAt, updatedAt) và cho Customer,
 *    Product, Order "extends" nó: tránh lặp lại 3 field này ở mọi
 *    entity, đúng nguyên tắc DRY (Don't Repeat Yourself).
 *
 * 3. Generic Repository<TEntity, TCreateDto, TUpdateDto>: một entity
 *    khi cần thao tác CRUD chỉ cần "cắm" đúng 3 type vào, không phải
 *    viết lại interface CRUD cho từng entity (OrderRepository,
 *    ProductRepository...). Đây là điểm thể hiện rõ nhất việc dùng
 *    generic để tái sử dụng.
 *
 * 4. Omit<Entity, keyof BaseEntity> cho các Create DTO: id/createdAt/
 *    updatedAt do hệ thống tự sinh, người dùng không được truyền vào
 *    khi tạo mới -> Omit loại bỏ đúng các field đó mà không cần viết
 *    lại toàn bộ field còn lại.
 *
 * 5. Partial<CreateXxxDto> cho các Update DTO: khi cập nhật, người
 *    dùng có thể chỉ sửa 1-2 field, không bắt buộc gửi đủ toàn bộ
 *    field như lúc tạo mới -> Partial biến tất cả field thành optional
 *    dựa trên type đã có sẵn, tránh định nghĩa interface trùng lặp.
 *
 * 6. Pick<Entity, "field1" | "field2"> cho các "Summary/Snapshot" type
 *    (CustomerSummary, ProductSnapshot): khi nhúng Customer vào Order
 *    hoặc Product vào OrderItem, ta không cần toàn bộ field (ví dụ
 *    không cần stockQuantity của Product trong đơn hàng) -> Pick giúp
 *    lấy đúng tập field cần thiết, giảm payload và tránh rò rỉ dữ liệu
 *    không liên quan.
 *
 * 7. ProductSnapshot trong OrderItem thay vì tham chiếu trực tiếp
 *    Product: vì giá sản phẩm có thể thay đổi theo thời gian, đơn hàng
 *    cần "chụp lại" (snapshot) thông tin tại thời điểm đặt hàng để đảm
 *    bảo tính toàn vẹn lịch sử, không bị ảnh hưởng khi Product được
 *    cập nhật sau này.
 *
 * 8. Record<OrderStatus, string> cho OrderStatusLabel: bắt TypeScript
 *    kiểm tra bắt buộc phải có nhãn hiển thị cho MỌI giá trị của enum
 *    OrderStatus, nếu thêm trạng thái mới vào enum mà quên thêm label
 *    thì sẽ báo lỗi compile-time thay vì lỗi runtime.
 *
 * 9. ApiResponse<T> và PaginatedResult<T> là generic dùng chung cho
 *    toàn bộ API của hệ thống (không riêng module đơn hàng), giúp
 *    chuẩn hoá format phản hồi và tái sử dụng cho Order, Product,
 *    Customer hay bất kỳ entity nào khác sau này.
 *
 * 10. CreateOrderDto minh hoạ việc kết hợp Omit và intersection (&):
 *     vừa loại bỏ các field không được phép truyền vào (status tự mặc
 *     định PENDING, totalAmount tự tính từ items...), vừa thêm field
 *     mới phù hợp với input thực tế từ client (customerId, items dạng
 *     CreateOrderItemDto[] thay vì OrderItem[] đầy đủ).
 * ============================================================
 */