// 1. Explicit typing
function explicitTyping(items: any[]): number {
    return items.length
  }
  
  // 2. Type assertion
  function typeAssertion(items: any): number {
    return (items as any[]).length
  }
  
  // 3. Type guard
  function typeGuard(items: any): number {
    if (Array.isArray(items)) {
      return items.length
    }
    return 0 // or throw an error, depending on your use case
  }
  
  // 4. Optional chaining
  function optionalChaining(items: any): number | undefined {
    return items?.length
  }
  
  // Usage example
  const someItems: any = [1, 2, 3]
  
  console.log(explicitTyping(someItems))
  console.log(typeAssertion(someItems))
  console.log(typeGuard(someItems))
  console.log(optionalChaining(someItems))
  
  