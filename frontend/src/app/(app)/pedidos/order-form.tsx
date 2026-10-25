'use client';

import { startTransition, useActionState, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import type { OrderPayload } from '@/lib/api/types';
import type { FormState } from '@/lib/form-state';
import { formatCurrency, maskDocument } from '@/lib/format';
import {
  LIMITS,
  newItem,
  parsePrice,
  toPayload,
  validateOrder,
  type ItemValues,
  type OrderFormValues,
} from './order-form-values';

interface OrderFormProps {
  initialValues: OrderFormValues;
  action: (prev: FormState, payload: OrderPayload) => Promise<FormState>;
  submitLabel: string;
  cancelHref: string;
}

/**
 * Formulário controlado: os itens são dinâmicos e o envio é um objeto JSON
 * (não FormData), então os valores não se perdem quando a API recusa.
 */
export function OrderForm({
  initialValues,
  action,
  submitLabel,
  cancelHref,
}: OrderFormProps) {
  const [values, setValues] = useState(initialValues);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [state, dispatch, pending] = useActionState(action, {});

  // Erros locais têm prioridade; os da API aparecem até a próxima edição.
  const errors = { ...state.fieldErrors, ...clientErrors };

  function set<K extends keyof OrderFormValues>(
    key: K,
    value: OrderFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setItem(index: number, patch: Partial<ItemValues>) {
    setValues((v) => ({
      ...v,
      items: v.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateOrder(values);
    setClientErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError();
      return;
    }
    startTransition(() => dispatch(toPayload(values)));
  }

  const total = values.items.reduce((acc, item) => {
    const price = parsePrice(item.price);
    return Number.isNaN(price) ? acc : acc + Math.round(price * 100);
  }, 0);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {state.errors && (
        <Alert
          tone="error"
          title="Não foi possível salvar o pedido"
          messages={state.errors}
        />
      )}

      <Card>
        <CardHeader
          title="Pedido"
          description="Identificação e dados da entrega."
        />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Número do pedido"
            htmlFor="orderNumber"
            error={errors.orderNumber}
          >
            <Input
              id="orderNumber"
              value={values.orderNumber}
              onChange={(e) => set('orderNumber', e.target.value)}
              maxLength={LIMITS.orderNumber}
              placeholder="PED-1001"
              invalid={!!errors.orderNumber}
              autoComplete="off"
            />
          </Field>
          <Field
            label="Previsão de entrega"
            htmlFor="expectedDeliveryDate"
            error={errors.expectedDeliveryDate}
          >
            <Input
              id="expectedDeliveryDate"
              type="date"
              value={values.expectedDeliveryDate}
              onChange={(e) => set('expectedDeliveryDate', e.target.value)}
              invalid={!!errors.expectedDeliveryDate}
            />
          </Field>
          <Field
            label="Endereço de entrega"
            htmlFor="deliveryAddress"
            error={errors.deliveryAddress}
            className="sm:col-span-2"
          >
            <Textarea
              id="deliveryAddress"
              rows={2}
              value={values.deliveryAddress}
              onChange={(e) => set('deliveryAddress', e.target.value)}
              maxLength={LIMITS.deliveryAddress}
              placeholder="Rua, número, bairro, cidade - UF, CEP"
              invalid={!!errors.deliveryAddress}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Cliente"
          description="Se o CPF/CNPJ já existir, o cadastro do cliente é reaproveitado e atualizado."
        />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nome ou razão social"
            htmlFor="customerName"
            error={errors['customer.name']}
            className="sm:col-span-2"
          >
            <Input
              id="customerName"
              value={values.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              maxLength={LIMITS.customerName}
              invalid={!!errors['customer.name']}
              autoComplete="off"
            />
          </Field>
          <Field
            label="CPF ou CNPJ"
            htmlFor="customerDocument"
            error={errors['customer.document']}
          >
            <Input
              id="customerDocument"
              value={values.customerDocument}
              onChange={(e) =>
                set('customerDocument', maskDocument(e.target.value))
              }
              placeholder="000.000.000-00"
              invalid={!!errors['customer.document']}
              autoComplete="off"
            />
          </Field>
          <Field
            label="Email do cliente"
            htmlFor="customerEmail"
            error={errors['customer.email']}
            hint="Recebe a confirmação e as atualizações do pedido."
          >
            <Input
              id="customerEmail"
              type="email"
              value={values.customerEmail}
              onChange={(e) => set('customerEmail', e.target.value)}
              maxLength={LIMITS.email}
              placeholder="cliente@email.com"
              invalid={!!errors['customer.email']}
              autoComplete="off"
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Itens"
          description={`${values.items.length} de até ${LIMITS.items} itens.`}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setValues((v) => ({ ...v, items: [...v.items, newItem()] }))
              }
              disabled={values.items.length >= LIMITS.items}
            >
              <span aria-hidden="true">+</span> Adicionar item
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {errors.items && <Alert tone="error" messages={[errors.items]} />}
          {values.items.map((item, i) => (
            <div
              key={item.key}
              className="grid gap-3 rounded-xl border border-ink-100 bg-ink-50/50 p-3 sm:grid-cols-[1fr_10rem_auto] sm:items-start"
            >
              <Field
                label={`Descrição do item ${i + 1}`}
                htmlFor={`item-${item.key}-description`}
                error={errors[`items.${i}.description`]}
              >
                <Input
                  id={`item-${item.key}-description`}
                  value={item.description}
                  onChange={(e) => setItem(i, { description: e.target.value })}
                  maxLength={LIMITS.itemDescription}
                  placeholder="Ex.: Caixa de som Bluetooth"
                  invalid={!!errors[`items.${i}.description`]}
                />
              </Field>
              <Field
                label="Valor (R$)"
                htmlFor={`item-${item.key}-price`}
                error={errors[`items.${i}.price`]}
              >
                <Input
                  id={`item-${item.key}-price`}
                  inputMode="decimal"
                  value={item.price}
                  onChange={(e) => setItem(i, { price: e.target.value })}
                  placeholder="0,00"
                  className="text-right tabular-nums"
                  invalid={!!errors[`items.${i}.price`]}
                />
              </Field>
              <Button
                variant="ghost"
                size="sm"
                className="sm:mt-7"
                onClick={() =>
                  setValues((v) => ({
                    ...v,
                    items: v.items.filter((_, index) => index !== i),
                  }))
                }
                disabled={values.items.length === 1}
                aria-label={`Remover item ${i + 1}`}
              >
                Remover
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-end gap-3 pt-2">
            <span className="text-sm text-ink-500">Total</span>
            <span className="text-lg font-semibold text-ink-900 tabular-nums">
              {formatCurrency(total / 100)}
            </span>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ButtonLink href={cancelHref} variant="secondary">
          Cancelar
        </ButtonLink>
        <SubmitButton pending={pending} pendingLabel="Salvando…">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

function focusFirstError() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
