---
title: "用 .NET 8 构建一个可测试的订单 Minimal API"
description: "从边界设计、请求验证到集成测试，记录一个小型订单接口如何保持简单而不失可维护性。"
date: 2026-09-16T09:30:00+08:00
lastmod: 2026-09-16T09:30:00+08:00
draft: false
summary: "Minimal API 不是把所有代码都塞进 Program.cs，而是用清晰的边界把 HTTP、业务和持久化隔开。"
categories:
  - .NET
tags:
  - .NET 8
  - ASP.NET Core
  - Minimal API
  - C#
  - 测试
series:
  - .NET 实战
toc: true
math: false
mermaid: false
dotnet: ".NET 8"
repository: "https://github.com/ilwren/ilwren.github.io"
ai_assisted: true
ai_tools:
  - "Vibe Coding"
verification: "示例代码已完成结构检查，接入真实数据库前仍需补充项目级测试"
---

{{< techStack items=".NET 8,ASP.NET Core Minimal API,C#,FluentValidation,SQLite,xUnit" >}}

## 问题背景

一个订单接口看起来很小：接收客户编号和商品明细，创建订单，然后返回订单编号。真正开始实现后，需求通常会迅速增加：商品数量必须大于零，价格不能由客户端决定，重复提交不能生成两笔订单，数据库失败时还要返回稳定的错误格式。

这篇文章用一个简化的订单创建接口说明如何拆分边界。重点不是堆叠框架，而是让每一层只负责一件容易验证的事情。

## 先定义用例，而不是先写路由

我先把用例写成输入、规则和输出：

| 部分 | 约定 |
| --- | --- |
| 输入 | 客户编号、商品编号和购买数量 |
| 业务规则 | 商品必须存在且处于可售状态，数量必须大于零 |
| 输出 | 新订单编号、订单状态和创建时间 |
| 失败 | 使用 Problem Details 返回可读错误 |

这个列表可以直接变成测试清单。它也提醒我们：HTTP 请求模型中的价格字段不应该存在，价格应该从商品目录读取。

## 用请求模型保护边界

Minimal API 的路由可以很短，但请求模型仍然应该明确表达客户端允许提交的字段：

```csharp
public sealed record CreateOrderRequest(
    Guid CustomerId,
    IReadOnlyList<OrderLineRequest> Lines);

public sealed record OrderLineRequest(
    Guid ProductId,
    int Quantity);

public sealed record CreateOrderResponse(
    Guid OrderId,
    string Status,
    DateTimeOffset CreatedAt);
```

接下来把业务动作放进用例服务，而不是让 endpoint 直接操作 `DbContext`：

```csharp
public interface ICreateOrder
{
    Task<Result<CreateOrderResponse>> ExecuteAsync(
        CreateOrderRequest request,
        CancellationToken cancellationToken);
}
```

路由只负责绑定请求、传递取消信号和转换响应：

```csharp
app.MapPost("/api/orders", async (
    CreateOrderRequest request,
    ICreateOrder createOrder,
    CancellationToken cancellationToken) =>
{
    var result = await createOrder.ExecuteAsync(request, cancellationToken);

    return result.Match(
        response => Results.Created($"/api/orders/{response.OrderId}", response),
        error => Results.Problem(
            title: error.Title,
            detail: error.Detail,
            statusCode: error.StatusCode));
});
```

这里的 `Result<T>` 可以是项目自己的轻量类型，也可以使用已有库。重要的是，不要让异常类型、数据库实体或内部错误消息直接穿过 API 边界。

## 验证要分两层

第一层是请求格式验证，例如客户编号不能是空值、订单行不能为空、数量必须大于零。这一层不需要访问数据库。

第二层是业务验证，例如商品是否存在、库存是否足够、重复请求是否已处理。这一层必须在用例服务中完成，因为它依赖当前数据和事务。

```csharp
public async Task<Result<CreateOrderResponse>> ExecuteAsync(
    CreateOrderRequest request,
    CancellationToken cancellationToken)
{
    if (request.Lines.Count == 0 || request.Lines.Any(line => line.Quantity <= 0))
    {
        return OrderErrors.InvalidLines;
    }

    var productIds = request.Lines.Select(line => line.ProductId).ToArray();
    var products = await productCatalog.FindSellableAsync(productIds, cancellationToken);

    if (products.Count != productIds.Length)
    {
        return OrderErrors.ProductUnavailable;
    }

    // 在真实项目中，这里还需要幂等键、事务和库存并发控制。
    var order = Order.Create(request.CustomerId, request.Lines, products);
    dbContext.Orders.Add(order);
    await dbContext.SaveChangesAsync(cancellationToken);

    return new CreateOrderResponse(order.Id, order.Status, order.CreatedAt);
}
```

示例刻意没有假装解决所有生产问题。库存扣减、幂等键和并发策略应该根据业务语义单独设计，而不是用一个巨大的 endpoint 解决。

## 测试先覆盖行为

我会先写三个核心测试：正常创建、输入无效、商品不存在。测试不需要知道数据库表的每一列，只关心用例对外的结果。

```csharp
[Fact]
public async Task ExecuteAsync_returns_created_order_for_sellable_products()
{
    var request = new CreateOrderRequest(customerId, [new(productId, 2)]);
    productCatalog.ReturnSellable(productId, price: 19.90m);

    var result = await sut.ExecuteAsync(request, CancellationToken.None);

    result.IsSuccess.Should().BeTrue();
    dbContext.Orders.Should().ContainSingle(order => order.CustomerId == customerId);
}

[Fact]
public async Task ExecuteAsync_rejects_non_positive_quantity()
{
    var request = new CreateOrderRequest(customerId, [new(productId, 0)]);

    var result = await sut.ExecuteAsync(request, CancellationToken.None);

    result.Error.Should().Be(OrderErrors.InvalidLines);
}
```

如果未来把持久化方式从 SQLite 换成 PostgreSQL，这些测试仍然能保留，因为它们测试的是用例而不是 SQL 方言。

## 总结

Minimal API 的价值不是少写几行代码，而是让 HTTP 层保持薄。一个可维护的最小实现通常包含：

1. 明确的请求和响应模型；
2. 独立的用例服务；
3. 可预测的错误转换；
4. 对取消信号和事务边界的尊重；
5. 先覆盖行为的自动化测试。

当需求继续增长时，可以再引入更完整的模块化结构。不要因为项目现在很小，就把所有未来的抽象一次性搬进来。

{{< aiTrace tool="Vibe Coding" model="按文章实际记录" status="verified" >}}
AI 用于整理接口边界、补充测试场景和检查示例代码；最终结构、业务约束和“哪些问题尚未解决”由人工确认。示例没有声明已经连接真实数据库，接入项目时需要继续运行编译、集成测试和安全检查。
{{< /aiTrace >}}
