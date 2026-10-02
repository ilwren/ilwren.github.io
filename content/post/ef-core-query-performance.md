---
title: "EF Core 查询变慢时，先看投影和边界"
description: "用几个可重复验证的步骤排查 EF Core 查询性能，而不是一开始就把所有 Include 和缓存都加上。"
date: 2026-09-20T10:00:00+08:00
lastmod: 2026-09-20T10:00:00+08:00
draft: false
summary: "EF Core 性能优化的第一步通常不是换 ORM，而是确认查询到底取了什么、返回了多少行，以及数据库是否有正确的索引。"
categories:
  - .NET
tags:
  - EF Core
  - SQL
  - 性能优化
  - 数据库
  - ASP.NET Core
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
verification: "示例查询已进行静态检查，具体索引和执行计划需要在目标数据库上验证"
---

{{< techStack items=".NET 8,EF Core,LINQ,SQL Server,PostgreSQL,Benchmarking" >}}

## 问题背景

“列表页越来越慢”经常是一个模糊的症状。它可能来自一次查询返回了整张实体、一个不必要的 `Include`、分页发生在内存中，也可能只是数据库缺少过滤和排序所需的索引。

排查时我会坚持一个顺序：先确认 SQL，再确认数据量，最后才考虑缓存和更复杂的方案。

## 先用投影缩小结果

假设列表页只需要订单摘要，却直接返回了完整实体：

```csharp
var orders = await dbContext.Orders
    .Include(order => order.Lines)
    .Include(order => order.Customer)
    .Where(order => order.CustomerId == customerId)
    .ToListAsync(cancellationToken);
```

这段查询可能加载大量列和关联行，然后由应用层重新组装页面数据。更明确的做法是投影成页面需要的 DTO：

```csharp
var orders = await dbContext.Orders
    .AsNoTracking()
    .Where(order => order.CustomerId == customerId)
    .OrderByDescending(order => order.CreatedAt)
    .Select(order => new OrderSummary(
        order.Id,
        order.Status,
        order.CreatedAt,
        order.Lines.Sum(line => line.Quantity),
        order.Lines.Sum(line => line.Quantity * line.UnitPrice)))
    .ToListAsync(cancellationToken);
```

投影有三个好处：返回列更少、避免不必要的跟踪、让 API 的数据边界变得清晰。`AsNoTracking` 适合只读场景，但不能机械地添加到所有查询。需要更新实体时，仍然要考虑跟踪或显式附加实体的成本。

## 分页要发生在数据库

下面这种写法会先把所有订单加载到内存：

```csharp
var page = orders
    .OrderByDescending(order => order.CreatedAt)
    .Skip((pageNumber - 1) * pageSize)
    .Take(pageSize)
    .ToList();
```

正确的分页应该在 `IQueryable` 上完成：

```csharp
var page = await query
    .OrderByDescending(order => order.CreatedAt)
    .ThenByDescending(order => order.Id)
    .Skip((pageNumber - 1) * pageSize)
    .Take(pageSize)
    .Select(order => new OrderSummary(/* ... */))
    .ToListAsync(cancellationToken);
```

当页码很深时，`Skip` 仍然可能需要数据库扫描大量记录。这时可以改成基于游标的 Keyset Pagination：把上一页最后一条记录的时间和 ID 作为下一页条件。

```csharp
var query = dbContext.Orders
    .AsNoTracking()
    .Where(order =>
        order.CreatedAt < cursor.CreatedAt ||
        (order.CreatedAt == cursor.CreatedAt && order.Id < cursor.Id))
    .OrderByDescending(order => order.CreatedAt)
    .ThenByDescending(order => order.Id)
    .Take(pageSize);
```

排序字段必须稳定。只按时间排序而不补充唯一 ID，遇到相同时间戳时可能出现重复或漏项。

## 用 SQL 和执行计划验证假设

EF Core 可以通过 `ToQueryString()` 查看生成的 SQL：

```csharp
var query = dbContext.Orders
    .AsNoTracking()
    .Where(order => order.CustomerId == customerId)
    .OrderByDescending(order => order.CreatedAt)
    .Take(20);

logger.LogDebug("Order query: {Sql}", query.ToQueryString());
```

日志中的 SQL 只适合开发和排查，不应该直接拼接回应用执行。真正分析性能时，还要把 SQL 放到目标数据库中查看执行计划，并关注：

- `CustomerId`、过滤字段和排序字段是否有合适索引；
- 是否因为函数或类型转换导致索引失效；
- 实际返回行数是否远大于页面需要；
- 统计信息是否过期；
- 是否存在隐式加载或 N+1 查询。

一个常见的索引候选是过滤列加排序列，例如 `(CustomerId, CreatedAt)`，但索引顺序必须结合数据库、选择性和写入压力验证，不能仅凭经验复制。

## 不要用缓存掩盖错误查询

缓存可以减少重复读取，但它不能修复一次返回几十万行的查询。加入缓存前，我会先记录：

1. 查询的实际耗时和数据库耗时；
2. 返回行数和序列化大小；
3. 命中率、失效策略和一致性要求；
4. 数据变更后允许的最长陈旧时间。

如果这些问题没有答案，缓存通常只是把复杂度从数据库转移到了应用内存。

## 总结

EF Core 查询优化可以从很小的检查清单开始：

- 页面需要什么，就投影什么；
- 只读查询考虑 `AsNoTracking`；
- 在数据库中完成过滤、排序和分页；
- 用 `ToQueryString()` 和执行计划验证，而不是猜；
- 深分页考虑 Keyset Pagination；
- 缓存应该建立在可测量的瓶颈之上。

性能不是某个 ORM 方法的神奇开关，而是数据边界、SQL、索引和业务读取模式共同决定的结果。

{{< aiTrace tool="Vibe Coding" model="按文章实际记录" status="verified" >}}
AI 用于列举查询排查路径和反例；SQL、索引建议和分页边界需要结合实际数据库执行计划复核。没有把示例中的索引当成生产环境的直接迁移脚本。
{{< /aiTrace >}}
